import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey } from "@/lib/dates";

type ChallengeRow = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
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

type MappingRow = {
  challenge_id: string;
  skill_id: string;
};

type SelectionReason =
  | "weakest_measured"
  | "second_weakest_measured"
  | "ai_verification"
  | "spaced_reinforcement"
  | "unassessed_exploration"
  | "adaptive_variety"
  | "fallback";

type PlannedChallenge = {
  challenge: ChallengeRow;
  selectionReason: SelectionReason;
  targetSkillId: string | null;
};

export type DailyTrainingSession = {
  id: string | null;
  sessionDate: string;
  status: "in_progress" | "completed";
  challenges: ChallengeRow[];
  answeredChallengeIds: string[];
};

const CHALLENGE_FIELDS =
  "id,title,prompt,options,challenge_type,difficulty,confidence_required";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function effectiveScore(row: ScoreRow) {
  const reliability = clamp(Number(row.reliability ?? 0), 0, 1);
  return 50 + (Number(row.score) - 50) * reliability;
}

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

  const typedMappings = (mappings ?? []) as MappingRow[];

  for (const mapping of typedMappings) {
    const existing = mappingsBySkill.get(mapping.skill_id) ?? new Set<string>();
    existing.add(mapping.challenge_id);
    mappingsBySkill.set(mapping.skill_id, existing);
  }

  const mappedIds = [
    ...new Set(typedMappings.map((mapping) => mapping.challenge_id)),
  ].filter((id) => !excludedIds.has(id));

  const pool = await fetchChallenges(supabase, mappedIds);
  return { pool, mappingsBySkill };
}

function targetWeakSkillForChallenge(
  challengeId: string,
  measured: ScoreRow[],
  mappingsBySkill: Map<string, Set<string>>,
) {
  return (
    measured.find((row) => mappingsBySkill.get(row.skill_id)?.has(challengeId))
      ?.skill_id ?? null
  );
}

async function buildDailyPlan(
  supabase: SupabaseClient,
  userId: string,
  count: number,
  day: string,
): Promise<PlannedChallenge[]> {
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
  const plan: PlannedChallenge[] = [];

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

  const targetDifficulty = clamp(
    Math.round(averageEffectiveScore + 5),
    25,
    80,
  );

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

    if (picked) {
      plan.push({
        challenge: picked,
        selectionReason:
          index === 0 ? "weakest_measured" : "second_weakest_measured",
        targetSkillId: skill.skill_id,
      });
    }
  }

  if (plan.length < count) {
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
        ((aiData ?? []) as ChallengeRow[]).filter(
          (row) => !recentIds.has(row.id),
        ),
        used,
        targetDifficulty,
        `${seed}:ai-any`,
      );
    }

    if (picked) {
      plan.push({
        challenge: picked,
        selectionReason: "ai_verification",
        targetSkillId: targetWeakSkillForChallenge(
          picked.id,
          measured,
          mappingsBySkill,
        ),
      });
    }
  }

  if (plan.length < count) {
    const spacedIds: string[] = [];
    const seen = new Set<string>();

    for (const row of history.slice(12)) {
      if (seen.has(row.challenge_id)) continue;
      seen.add(row.challenge_id);

      if (
        !row.is_correct ||
        (row.confidence !== null && Number(row.confidence) <= 50)
      ) {
        spacedIds.push(row.challenge_id);
      }
    }

    const spacedPool = await fetchChallenges(
      supabase,
      spacedIds.slice(0, 40),
    );

    const picked = takeOne(
      spacedPool,
      used,
      targetDifficulty,
      `${seed}:spaced`,
    );

    if (picked) {
      plan.push({
        challenge: picked,
        selectionReason: "spaced_reinforcement",
        targetSkillId: targetWeakSkillForChallenge(
          picked.id,
          measured,
          mappingsBySkill,
        ),
      });
    }
  }

  if (plan.length < count && unassessed.length) {
    const explorationOrder = [...unassessed].sort(
      (a, b) =>
        hash(`${seed}:explore:${a.skill_id}`) -
        hash(`${seed}:explore:${b.skill_id}`),
    );

    const explorationSkillIds = explorationOrder.map(
      (row) => row.skill_id,
    );

    const {
      pool: explorationPool,
      mappingsBySkill: explorationMappings,
    } = await fetchMappedPool(
      supabase,
      explorationSkillIds,
      recentIds,
    );

    for (const skill of explorationOrder) {
      const ids =
        explorationMappings.get(skill.skill_id) ?? new Set<string>();
      const pool = explorationPool.filter((challenge) =>
        ids.has(challenge.id),
      );

      const picked = takeOne(
        pool,
        used,
        50,
        `${seed}:explore:${skill.skill_id}`,
      );

      if (picked) {
        plan.push({
          challenge: picked,
          selectionReason: "unassessed_exploration",
          targetSkillId: skill.skill_id,
        });
        break;
      }
    }
  }

  while (plan.length < count) {
    const usedTypes = new Set(
      plan.map((item) => item.challenge.challenge_type),
    );

    const variedWeak = weakPool.filter(
      (challenge) =>
        !used.has(challenge.id) &&
        !usedTypes.has(challenge.challenge_type),
    );

    const picked =
      takeOne(
        variedWeak,
        used,
        targetDifficulty,
        `${seed}:variety:${plan.length}`,
      ) ??
      takeOne(
        weakPool,
        used,
        targetDifficulty,
        `${seed}:weak-fill:${plan.length}`,
      );

    if (!picked) break;

    plan.push({
      challenge: picked,
      selectionReason: "adaptive_variety",
      targetSkillId: targetWeakSkillForChallenge(
        picked.id,
        measured,
        mappingsBySkill,
      ),
    });
  }

  if (plan.length < count) {
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

    while (plan.length < count) {
      const picked = takeOne(
        fallbackPool,
        used,
        targetDifficulty,
        `${seed}:fallback:${plan.length}`,
      );

      if (!picked) break;

      plan.push({
        challenge: picked,
        selectionReason: "fallback",
        targetSkillId: null,
      });
    }
  }

  return plan.slice(0, count);
}

async function loadSession(
  supabase: SupabaseClient,
  userId: string,
  session: {
    id: string;
    session_date: string;
    status: "in_progress" | "completed";
  },
): Promise<DailyTrainingSession> {
  const [
    { data: assignments, error: assignmentsError },
    { data: responses, error: responsesError },
  ] = await Promise.all([
    supabase
      .from("training_session_challenges")
      .select(
        "challenge_id,position,selection_reason,target_skill_id",
      )
      .eq("session_id", session.id)
      .order("position"),
    supabase
      .from("user_responses")
      .select("challenge_id")
      .eq("user_id", userId)
      .eq("session_key", session.id),
  ]);

  if (assignmentsError) throw assignmentsError;
  if (responsesError) throw responsesError;

  const challengeIds = (assignments ?? []).map(
    (row) => row.challenge_id,
  );

  const challenges = await fetchChallenges(supabase, challengeIds);
  const byId = new Map(challenges.map((challenge) => [challenge.id, challenge]));

  const orderedChallenges = (assignments ?? [])
    .map((row) => byId.get(row.challenge_id))
    .filter((challenge): challenge is ChallengeRow => Boolean(challenge));

  return {
    id: session.id,
    sessionDate: session.session_date,
    status: session.status,
    challenges: orderedChallenges,
    answeredChallengeIds: (responses ?? []).map(
      (row) => row.challenge_id,
    ),
  };
}

export async function getOrCreateDailyTrainingSession(
  supabase: SupabaseClient,
  userId: string,
  count = 5,
): Promise<DailyTrainingSession> {
  const day = localDateKey();

  const { data: existing, error: existingError } = await supabase
    .from("training_sessions")
    .select("id,session_date,status")
    .eq("user_id", userId)
    .eq("session_date", day)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    return loadSession(
      supabase,
      userId,
      existing as {
        id: string;
        session_date: string;
        status: "in_progress" | "completed";
      },
    );
  }

  const plan = await buildDailyPlan(supabase, userId, count, day);

  if (!plan.length) {
    return {
      id: null,
      sessionDate: day,
      status: "in_progress",
      challenges: [],
      answeredChallengeIds: [],
    };
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin
    .from("training_sessions")
    .insert({
      user_id: userId,
      session_date: day,
      status: "in_progress",
    })
    .select("id,session_date,status")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      const { data: raced, error: racedError } = await supabase
        .from("training_sessions")
        .select("id,session_date,status")
        .eq("user_id", userId)
        .eq("session_date", day)
        .single();

      if (racedError) throw racedError;

      return loadSession(
        supabase,
        userId,
        raced as {
          id: string;
          session_date: string;
          status: "in_progress" | "completed";
        },
      );
    }

    throw createError;
  }

  const assignmentRows = plan.map((item, index) => ({
    session_id: created.id,
    position: index + 1,
    challenge_id: item.challenge.id,
    selection_reason: item.selectionReason,
    target_skill_id: item.targetSkillId,
  }));

  const { error: assignmentError } = await admin
    .from("training_session_challenges")
    .insert(assignmentRows);

  if (assignmentError) {
    await admin.from("training_sessions").delete().eq("id", created.id);
    throw assignmentError;
  }

  return loadSession(
    supabase,
    userId,
    created as {
      id: string;
      session_date: string;
      status: "in_progress" | "completed";
    },
  );
}
