import type { SupabaseClient } from "@supabase/supabase-js";

type ChallengeRow = {
  id: string;
  title: string;
  prompt: string;
  options: unknown;
  challenge_type: string;
  difficulty: number;
  confidence_required: boolean;
};

type ScoreRow = {
  skill_id: string;
  score: number;
  last_seen_at: string | null;
};

type ResponseRow = {
  challenge_id: string;
  is_correct: boolean;
  confidence: number | null;
  created_at: string;
};

const CHALLENGE_FIELDS =
  "id,title,prompt,options,challenge_type,difficulty,confidence_required";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Small deterministic hash so a user's daily set is stable across refreshes,
 * while still changing from day to day. This avoids needing database-side
 * random ordering and makes interrupted sessions less surprising.
 */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rankCandidates(
  rows: ChallengeRow[],
  targetDifficulty: number,
  seed: string,
) {
  return [...rows].sort((a, b) => {
    const difficultyA = Math.abs(a.difficulty - targetDifficulty);
    const difficultyB = Math.abs(b.difficulty - targetDifficulty);
    if (difficultyA !== difficultyB) return difficultyA - difficultyB;
    return hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
  });
}

function takeOne(
  rows: ChallengeRow[],
  used: Set<string>,
  targetDifficulty: number,
  seed: string,
) {
  const ranked = rankCandidates(
    rows.filter((row) => !used.has(row.id)),
    targetDifficulty,
    seed,
  );
  const picked = ranked[0];
  if (picked) used.add(picked.id);
  return picked;
}

async function fetchChallenges(
  supabase: SupabaseClient,
  ids: string[],
): Promise<ChallengeRow[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("challenges")
    .select(CHALLENGE_FIELDS)
    .in("id", ids)
    .eq("is_published", true)
    .eq("is_diagnostic", false);

  if (error) throw error;
  return (data ?? []) as ChallengeRow[];
}

/**
 * Five-question MVP daily-session composition:
 *  1-2. Reinforce the two weakest measured skills.
 *  3.   Include an AI-output audit where possible.
 *  4.   Revisit a previous incorrect / low-confidence item once it is no
 *       longer recent (spaced reinforcement). If none exists yet, backfill
 *       from weak-skill practice.
 *  5.   Add a varied challenge, still biased toward weak skills and an
 *       appropriate difficulty.
 *
 * The selector excludes the 12 most recently answered challenge IDs from
 * normal selection. A spaced-repetition item may come from older history.
 */
export async function getDailyChallenges(
  supabase: SupabaseClient,
  userId: string,
  count = 5,
) {
  const day = new Date().toISOString().slice(0, 10);
  const seed = `${userId}:${day}`;

  const [{ data: scoreData, error: scoreError }, { data: responseData, error: responseError }] =
    await Promise.all([
      supabase
        .from("user_skill_scores")
        .select("skill_id,score,last_seen_at")
        .eq("user_id", userId)
        .order("score")
        .limit(4),
      supabase
        .from("user_responses")
        .select("challenge_id,is_correct,confidence,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  if (scoreError) throw scoreError;
  if (responseError) throw responseError;

  const weak = (scoreData ?? []) as ScoreRow[];
  const history = (responseData ?? []) as ResponseRow[];
  const recentIds = new Set(history.slice(0, 12).map((row) => row.challenge_id));
  const weakIds = weak.map((row) => row.skill_id);
  const used = new Set<string>();
  const selected: ChallengeRow[] = [];

  // Slightly above the weakest demonstrated level, but never extreme.
  const averageWeakScore = weak.length
    ? weak.reduce((sum, row) => sum + Number(row.score), 0) / weak.length
    : 50;
  const targetDifficulty = clamp(Math.round(averageWeakScore + 5), 25, 80);

  let weakPool: ChallengeRow[] = [];
  const mappingsBySkill = new Map<string, Set<string>>();

  if (weakIds.length) {
    const { data: mappings, error: mappingError } = await supabase
      .from("challenge_skill_mapping")
      .select("challenge_id,skill_id")
      .in("skill_id", weakIds)
      .limit(250);

    if (mappingError) throw mappingError;

    for (const mapping of mappings ?? []) {
      const existing = mappingsBySkill.get(mapping.skill_id) ?? new Set<string>();
      existing.add(mapping.challenge_id);
      mappingsBySkill.set(mapping.skill_id, existing);
    }

    const mappedIds = [
      ...new Set((mappings ?? []).map((mapping) => mapping.challenge_id)),
    ].filter((id) => !recentIds.has(id));

    weakPool = await fetchChallenges(supabase, mappedIds);
  }

  // Slots 1-2: distinct weakest-skill reinforcement where content exists.
  for (let index = 0; index < Math.min(2, weak.length, count); index += 1) {
    const skill = weak[index];
    const ids = mappingsBySkill.get(skill.skill_id) ?? new Set<string>();
    const pool = weakPool.filter((challenge) => ids.has(challenge.id));
    const picked = takeOne(
      pool,
      used,
      clamp(Math.round(Number(skill.score) + 5), 25, 80),
      `${seed}:weak:${index}`,
    );
    if (picked) selected.push(picked);
  }

  // Slot 3: AI-output verification practice, preferably also from a weak skill.
  if (selected.length < count) {
    const weakAiPool = weakPool.filter(
      (challenge) => challenge.challenge_type === "ai_answer_audit",
    );
    let picked = takeOne(
      weakAiPool,
      used,
      targetDifficulty,
      `${seed}:ai-weak`,
    );

    if (!picked) {
      const { data: aiData, error: aiError } = await supabase
        .from("challenges")
        .select(CHALLENGE_FIELDS)
        .eq("is_published", true)
        .eq("is_diagnostic", false)
        .eq("challenge_type", "ai_answer_audit")
        .limit(50);
      if (aiError) throw aiError;
      picked = takeOne(
        ((aiData ?? []) as ChallengeRow[]).filter((row) => !recentIds.has(row.id)),
        used,
        targetDifficulty,
        `${seed}:ai-any`,
      );
    }
    if (picked) selected.push(picked);
  }

  // Slot 4: spaced reinforcement of an older mistake / low-confidence answer.
  if (selected.length < count) {
    const spacedIds: string[] = [];
    const seen = new Set<string>();
    for (const row of history.slice(12)) {
      if (seen.has(row.challenge_id)) continue;
      seen.add(row.challenge_id);
      if (!row.is_correct || (row.confidence !== null && row.confidence <= 50)) {
        spacedIds.push(row.challenge_id);
      }
    }

    const spacedPool = await fetchChallenges(supabase, spacedIds.slice(0, 40));
    const picked = takeOne(
      spacedPool,
      used,
      targetDifficulty,
      `${seed}:spaced`,
    );
    if (picked) selected.push(picked);
  }

  // Fill remaining slots from weak-skill practice, favouring type variety.
  while (selected.length < count) {
    const usedTypes = new Set(selected.map((challenge) => challenge.challenge_type));
    const variedWeak = weakPool.filter(
      (challenge) => !used.has(challenge.id) && !usedTypes.has(challenge.challenge_type),
    );
    const picked =
      takeOne(
        variedWeak,
        used,
        targetDifficulty,
        `${seed}:variety:${selected.length}`,
      ) ??
      takeOne(
        weakPool,
        used,
        targetDifficulty,
        `${seed}:weak-fill:${selected.length}`,
      );

    if (!picked) break;
    selected.push(picked);
  }

  // Final safety fallback: any published, non-diagnostic, non-recent content.
  if (selected.length < count) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("challenges")
      .select(CHALLENGE_FIELDS)
      .eq("is_published", true)
      .eq("is_diagnostic", false)
      .limit(100);
    if (fallbackError) throw fallbackError;

    const fallbackPool = ((fallbackData ?? []) as ChallengeRow[]).filter(
      (row) => !recentIds.has(row.id),
    );

    while (selected.length < count) {
      const picked = takeOne(
        fallbackPool,
        used,
        targetDifficulty,
        `${seed}:fallback:${selected.length}`,
      );
      if (!picked) break;
      selected.push(picked);
    }
  }

  return selected.slice(0, count);
}
