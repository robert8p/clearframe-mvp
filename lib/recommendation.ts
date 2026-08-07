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
  reliability: number;
  attempts: number;
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
 * Shrink noisy early scores back toward the neutral 50 baseline.
 * With only one or two observations, we should not pretend a raw score is a
 * reliable estimate of capability. As reliability rises, the effective score
 * converges toward the observed score.
 */
function effectiveScore(row: ScoreRow) {
  const reliability = clamp(Number(row.reliability ?? 0), 0, 1);
  return 50 + (Number(row.score) - 50) * reliability;
}

/**
 * Small deterministic hash so a user's daily set is stable across refreshes,
 * while still changing from day to day.
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

async function fetchMappedPool(
  supabase: SupabaseClient,
  skillIds: string[],
  excludedIds: Set<string>,
) {
  const mappingsBySkill = new Map<string, Set<string>>();
  if (!skillIds.length) {
    return { pool: [] as ChallengeRow[], mappingsBySkill };
  }

  const { data: mappings, error: mappingError } = await supabase
    .from("challenge_skill_mapping")
    .select("challenge_id,skill_id")
    .in("skill_id", skillIds)
    .limit(400);

  if (mappingError) throw mappingError;

  for (const mapping of mappings ?? []) {
    const existing = mappingsBySkill.get(mapping.skill_id) ?? new Set<string>();
    existing.add(mapping.challenge_id);
    mappingsBySkill.set(mapping.skill_id, existing);
  }

  const mappedIds = [
    ...new Set((mappings ?? []).map((mapping) => mapping.challenge_id)),
  ].filter((id) => !excludedIds.has(id));

  const pool = await fetchChallenges(supabase, mappedIds);
  return { pool, mappingsBySkill };
}

/**
 * Five-question MVP daily-session composition:
 *
 *  1. Reinforce the lowest current *measured* capability.
 *  2. Reinforce the second-lowest current *measured* capability.
 *  3. Include an AI-output audit where possible.
 *  4. Revisit an older incorrect / low-confidence response (spaced practice).
 *  5. Explore an as-yet unassessed skill; once coverage is complete, use a
 *     varied adaptive challenge instead.
 *
 * Important measurement rule: attempts=0 is "unassessed", not "weak".
 * Early raw scores are also reliability-shrunk toward 50 so one answer cannot
 * be treated as a strong capability diagnosis.
 */
export async function getDailyChallenges(
  supabase: SupabaseClient,
  userId: string,
  count = 5,
) {
  const day = new Date().toISOString().slice(0, 10);
  const seed = `${userId}:${day}`;

  const [
    { data: measuredData, error: measuredError },
    { data: unassessedData, error: unassessedError },
    { data: responseData, error: responseError },
  ] = await Promise.all([
    supabase
      .from("user_skill_scores")
      .select("skill_id,score,reliability,attempts,last_seen_at")
      .eq("user_id", userId)
      .gt("attempts", 0)
      .limit(50),
    supabase
      .from("user_skill_scores")
      .select("skill_id,score,reliability,attempts,last_seen_at")
      .eq("user_id", userId)
      .eq("attempts", 0)
      .limit(50),
    supabase
      .from("user_responses")
      .select("challenge_id,is_correct,confidence,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (measuredError) throw measuredError;
  if (unassessedError) throw unassessedError;
  if (responseError) throw responseError;

  const measured = ((measuredData ?? []) as ScoreRow[]).sort((a, b) => {
    const effectiveDiff = effectiveScore(a) - effectiveScore(b);
    if (effectiveDiff !== 0) return effectiveDiff;
    if (a.attempts !== b.attempts) return a.attempts - b.attempts;
    return a.skill_id.localeCompare(b.skill_id);
  });

  const unassessed = (unassessedData ?? []) as ScoreRow[];
  const history = (responseData ?? []) as ResponseRow[];
  const recentIds = new Set(history.slice(0, 12).map((row) => row.challenge_id));
  const used = new Set<string>();
  const selected: ChallengeRow[] = [];

  const measuredIds = measured.slice(0, 4).map((row) => row.skill_id);
  const { pool: weakPool, mappingsBySkill } = await fetchMappedPool(
    supabase,
    measuredIds,
    recentIds,
  );

  const averageEffectiveScore = measured.length
    ? measured
        .slice(0, 4)
        .reduce((sum, row) => sum + effectiveScore(row), 0) /
      Math.min(4, measured.length)
    : 50;
  const targetDifficulty = clamp(Math.round(averageEffectiveScore + 5), 25, 80);

  // Slots 1-2: weakest measured skills only. Unassessed skills never enter here.
  for (let index = 0; index < Math.min(2, measured.length, count); index += 1) {
    const skill = measured[index];
    const ids = mappingsBySkill.get(skill.skill_id) ?? new Set<string>();
    const pool = weakPool.filter((challenge) => ids.has(challenge.id));
    const picked = takeOne(
      pool,
      used,
      clamp(Math.round(effectiveScore(skill) + 5), 25, 80),
      `${seed}:weak:${index}`,
    );
    if (picked) selected.push(picked);
  }

  // Slot 3: AI-output verification practice, preferably also tied to a weak skill.
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

  // Slot 4: spaced reinforcement of an older mistake / low-confidence response.
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

  // Exploration slot: deliberately gain coverage of an unassessed capability.
  if (selected.length < count && unassessed.length) {
    const explorationOrder = [...unassessed].sort(
      (a, b) => hash(`${seed}:explore:${a.skill_id}`) - hash(`${seed}:explore:${b.skill_id}`),
    );
    const explorationSkillIds = explorationOrder.map((row) => row.skill_id);
    const { pool: explorationPool, mappingsBySkill: explorationMappings } =
      await fetchMappedPool(supabase, explorationSkillIds, recentIds);

    for (const skill of explorationOrder) {
      const ids = explorationMappings.get(skill.skill_id) ?? new Set<string>();
      const pool = explorationPool.filter((challenge) => ids.has(challenge.id));
      const picked = takeOne(
        pool,
        used,
        50,
        `${seed}:explore:${skill.skill_id}`,
      );
      if (picked) {
        selected.push(picked);
        break;
      }
    }
  }

  // Fill remaining slots from measured weak-skill practice, favouring type variety.
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
