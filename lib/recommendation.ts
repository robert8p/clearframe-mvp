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

const AI_AUDIT_TYPE = "ai_answer_audit";

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

    if (difficultyA !== difficultyB) {
      return difficultyA - difficultyB;
    }

    return hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
  });
}

function typeCounts(plan: PlannedChallenge[]) {
  const counts = new Map<string, number>();

  for (const item of plan) {
    counts.set(
      item.challenge.challenge_type,
      (counts.get(item.challenge.challenge_type) ?? 0) + 1,
    );
  }

  return counts;
}

function targetSkillCounts(plan: PlannedChallenge[]) {
  const counts = new Map<string, number>();

  for (const item of plan) {
    if (!item.targetSkillId) continue;

    counts.set(
      item.targetSkillId,
      (counts.get(item.targetSkillId) ?? 0) + 1,
    );
  }

  return counts;
}

function chooseDiverseChallenge(
  rows: ChallengeRow[],
  usedChallengeIds: Set<string>,
  plan: PlannedChallenge[],
  targetDifficulty: number,
  seed: string,
  options?: {
    avoidAiAudit?: boolean;
    requireType?: string;
    allowRepeatedType?: boolean;
  },
) {
  const available = rows.filter(
    (row) => !usedChallengeIds.has(row.id),
  );

  if (!available.length) return undefined;

  const counts = typeCounts(plan);
  const requireType = options?.requireType;
  const avoidAiAudit = options?.avoidAiAudit ?? false;
  const allowRepeatedType = options?.allowRepeatedType ?? false;

  const required = requireType
    ? available.filter((row) => row.challenge_type === requireType)
    : available;

  if (!required.length) return undefined;

  const preferred = required.filter((row) => {
    const currentTypeCount = counts.get(row.challenge_type) ?? 0;

    if (!allowRepeatedType && currentTypeCount > 0) return false;
    if (avoidAiAudit && row.challenge_type === AI_AUDIT_TYPE) return false;

    return true;
  });

  if (preferred.length) {
    return rankCandidates(preferred, targetDifficulty, seed)[0];
  }

  const uniqueTypeFallback = required.filter(
    (row) => (counts.get(row.challenge_type) ?? 0) === 0,
  );

  if (uniqueTypeFallback.length) {
    return rankCandidates(
      uniqueTypeFallback,
      targetDifficulty,
      `${seed}:unique-fallback`,
    )[0];
  }

  /*
   * Only relax the type-diversity rule if no distinct challenge type is
   * available. Even then, cap any one type at two appearances in a
   * five-question session.
   */
  const maxTwoOfType = required.filter(
    (row) => (counts.get(row.challenge_type) ?? 0) < 2,
  );

  if (maxTwoOfType.length) {
    return rankCandidates(
      maxTwoOfType,
      targetDifficulty,
      `${seed}:repeat-fallback`,
    )[0];
  }

  return undefined;
}

function addPlanItem(
  plan: PlannedChallenge[],
  usedChallengeIds: Set<string>,
  item: PlannedChallenge,
) {
  plan.push(item);
  usedChallengeIds.add(item.challenge.id);
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

async function fetchGeneralPool(
  supabase: SupabaseClient,
  excludedIds: Set<string>,
) {
  const { data, error } = await supabase
    .from("challenges")
    .select(CHALLENGE_FIELDS)
    .eq("is_published", true)
    .eq("is_diagnostic", false)
    .limit(200);

  if (error) throw error;

  return ((data ?? []) as ChallengeRow[]).filter(
    (row) => !excludedIds.has(row.id),
  );
}

async function fetchMappedPool(
  supabase: SupabaseClient,
  skillIds: string[],
  excludedIds: Set<string>,
) {
  const mappingsBySkill = new Map<string, Set<string>>();

  if (!skillIds.length) {
    return {
      pool: [] as ChallengeRow[],
      mappingsBySkill,
    };
  }

  const { data: mappings, error: mappingError } = await supabase
    .from("challenge_skill_mapping")
    .select("challenge_id,skill_id")
    .in("skill_id", skillIds)
    .limit(600);

  if (mappingError) throw mappingError;

  for (const mapping of mappings ?? []) {
    const existing =
      mappingsBySkill.get(mapping.skill_id) ?? new Set<string>();

    existing.add(mapping.challenge_id);
    mappingsBySkill.set(mapping.skill_id, existing);
  }

  const mappedIds = [
    ...new Set((mappings ?? []).map((mapping) => mapping.challenge_id)),
  ].filter((id) => !excludedIds.has(id));

  const pool = await fetchChallenges(supabase, mappedIds);

  return { pool, mappingsBySkill };
}

function mappedChallengesForSkill(
  pool: ChallengeRow[],
  mappingsBySkill: Map<string, Set<string>>,
  skillId: string,
) {
  const ids = mappingsBySkill.get(skillId) ?? new Set<string>();

  return pool.filter((challenge) => ids.has(challenge.id));
}

function targetWeakSkillForChallenge(
  challengeId: string,
  measured: ScoreRow[],
  mappingsBySkill: Map<string, Set<string>>,
) {
  return (
    measured.find((row) =>
      mappingsBySkill.get(row.skill_id)?.has(challengeId),
    )?.skill_id ?? null
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
      .limit(150),
  ]);

  if (measuredError) throw measuredError;
  if (unassessedError) throw unassessedError;
  if (responseError) throw responseError;

  const measured = ((measuredData ?? []) as ScoreRow[]).sort(
    (a, b) => {
      const scoreDifference =
        effectiveScore(a) - effectiveScore(b);

      if (scoreDifference !== 0) return scoreDifference;
      if (a.attempts !== b.attempts) return a.attempts - b.attempts;

      return a.skill_id.localeCompare(b.skill_id);
    },
  );

  const unassessed = (unassessedData ?? []) as ScoreRow[];
  const history = (responseData ?? []) as ResponseRow[];

  /*
   * Recent-question avoidance is deliberately separate from spaced
   * repetition. The most recent twelve questions are protected from
   * immediate reuse; older mistakes can become spaced-review candidates.
   */
  const recentIds = new Set(
    history.slice(0, 12).map((row) => row.challenge_id),
  );

  const usedChallengeIds = new Set<string>();
  const plan: PlannedChallenge[] = [];

  const measuredIds = measured.slice(0, 6).map(
    (row) => row.skill_id,
  );

  const {
    pool: measuredPool,
    mappingsBySkill: measuredMappings,
  } = await fetchMappedPool(
    supabase,
    measuredIds,
    recentIds,
  );

  const averageEffectiveScore = measured.length
    ? measured
        .slice(0, 4)
        .reduce(
          (sum, row) => sum + effectiveScore(row),
          0,
        ) / Math.min(4, measured.length)
    : 50;

  const targetDifficulty = clamp(
    Math.round(averageEffectiveScore + 5),
    25,
    80,
  );

  /*
   * Slots 1 and 2: train the two lowest measured capabilities.
   *
   * We deliberately avoid an AI Answer Audit here when another suitable
   * exercise type exists. That preserves an AI-verification slot without
   * allowing the whole session to collapse into one exercise format.
   */
  for (
    let index = 0;
    index < Math.min(2, measured.length, count);
    index += 1
  ) {
    const skill = measured[index];

    const pool = mappedChallengesForSkill(
      measuredPool,
      measuredMappings,
      skill.skill_id,
    );

    const picked = chooseDiverseChallenge(
      pool,
      usedChallengeIds,
      plan,
      clamp(
        Math.round(effectiveScore(skill) + 5),
        25,
        80,
      ),
      `${seed}:weak:${index}`,
      {
        avoidAiAudit: true,
      },
    );

    if (!picked) continue;

    addPlanItem(plan, usedChallengeIds, {
      challenge: picked,
      selectionReason:
        index === 0
          ? "weakest_measured"
          : "second_weakest_measured",
      targetSkillId: skill.skill_id,
    });
  }

  /*
   * Slot 3: ensure the session contains an AI-output verification task.
   *
   * If one of the two weak-skill slots had no alternative and already had
   * to use an AI Answer Audit, we do not force a second one. Instead we use
   * the next measured capability with a distinct exercise type.
   */
  const alreadyHasAiAudit = plan.some(
    (item) =>
      item.challenge.challenge_type === AI_AUDIT_TYPE,
  );

  if (plan.length < count && !alreadyHasAiAudit) {
    const { data: aiData, error: aiError } = await supabase
      .from("challenges")
      .select(CHALLENGE_FIELDS)
      .eq("is_published", true)
      .eq("is_diagnostic", false)
      .eq("challenge_type", AI_AUDIT_TYPE)
      .limit(100);

    if (aiError) throw aiError;

    const aiPool = ((aiData ?? []) as ChallengeRow[]).filter(
      (row) => !recentIds.has(row.id),
    );

    const picked = chooseDiverseChallenge(
      aiPool,
      usedChallengeIds,
      plan,
      targetDifficulty,
      `${seed}:ai`,
      {
        requireType: AI_AUDIT_TYPE,
        allowRepeatedType: false,
      },
    );

    if (picked) {
      addPlanItem(plan, usedChallengeIds, {
        challenge: picked,
        selectionReason: "ai_verification",
        targetSkillId: targetWeakSkillForChallenge(
          picked.id,
          measured,
          measuredMappings,
        ),
      });
    }
  } else if (plan.length < count && measured.length > 2) {
    for (const skill of measured.slice(2, 6)) {
      const targetCounts = targetSkillCounts(plan);

      if ((targetCounts.get(skill.skill_id) ?? 0) > 0) {
        continue;
      }

      const pool = mappedChallengesForSkill(
        measuredPool,
        measuredMappings,
        skill.skill_id,
      );

      const picked = chooseDiverseChallenge(
        pool,
        usedChallengeIds,
        plan,
        clamp(
          Math.round(effectiveScore(skill) + 5),
          25,
          80,
        ),
        `${seed}:third-measured:${skill.skill_id}`,
        {
          avoidAiAudit: false,
        },
      );

      if (!picked) continue;

      addPlanItem(plan, usedChallengeIds, {
        challenge: picked,
        selectionReason: "adaptive_variety",
        targetSkillId: skill.skill_id,
      });

      break;
    }
  }

  /*
   * Slot 4 preference: spaced reinforcement.
   *
   * A repeat is only used when it is old enough to be outside the recent
   * protection window and was previously wrong or answered with low
   * confidence. We still prefer a challenge type not already used today.
   */
  if (plan.length < count) {
    const spacedIds: string[] = [];
    const seen = new Set<string>();

    for (const row of history.slice(12)) {
      if (seen.has(row.challenge_id)) continue;

      seen.add(row.challenge_id);

      if (
        !row.is_correct ||
        (row.confidence !== null &&
          Number(row.confidence) <= 50)
      ) {
        spacedIds.push(row.challenge_id);
      }
    }

    const spacedPool = await fetchChallenges(
      supabase,
      spacedIds.slice(0, 60),
    );

    const picked = chooseDiverseChallenge(
      spacedPool,
      usedChallengeIds,
      plan,
      targetDifficulty,
      `${seed}:spaced`,
    );

    if (picked) {
      addPlanItem(plan, usedChallengeIds, {
        challenge: picked,
        selectionReason: "spaced_reinforcement",
        targetSkillId: targetWeakSkillForChallenge(
          picked.id,
          measured,
          measuredMappings,
        ),
      });
    }
  }

  /*
   * If there is no eligible spaced-review item, deliberately sample one
   * capability we have not measured yet. This is exploration, not a claim
   * that the capability is weak.
   */
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
      const pool = mappedChallengesForSkill(
        explorationPool,
        explorationMappings,
        skill.skill_id,
      );

      const picked = chooseDiverseChallenge(
        pool,
        usedChallengeIds,
        plan,
        50,
        `${seed}:explore:${skill.skill_id}`,
      );

      if (!picked) continue;

      addPlanItem(plan, usedChallengeIds, {
        challenge: picked,
        selectionReason: "unassessed_exploration",
        targetSkillId: skill.skill_id,
      });

      break;
    }
  }

  /*
   * Final adaptive fill: prefer a new exercise type and, where possible,
   * a measured capability not already targeted in this session.
   */
  if (plan.length < count) {
    const generalPool = await fetchGeneralPool(
      supabase,
      recentIds,
    );

    const targetCounts = targetSkillCounts(plan);

    const untargetedMeasured = measured.filter(
      (skill) =>
        (targetCounts.get(skill.skill_id) ?? 0) === 0,
    );

    let added = false;

    for (const skill of untargetedMeasured) {
      const pool = mappedChallengesForSkill(
        measuredPool,
        measuredMappings,
        skill.skill_id,
      );

      const picked = chooseDiverseChallenge(
        pool,
        usedChallengeIds,
        plan,
        clamp(
          Math.round(effectiveScore(skill) + 5),
          25,
          80,
        ),
        `${seed}:measured-fill:${skill.skill_id}`,
      );

      if (!picked) continue;

      addPlanItem(plan, usedChallengeIds, {
        challenge: picked,
        selectionReason: "adaptive_variety",
        targetSkillId: skill.skill_id,
      });

      added = true;

      if (plan.length >= count) break;
    }

    while (plan.length < count) {
      const picked = chooseDiverseChallenge(
        generalPool,
        usedChallengeIds,
        plan,
        targetDifficulty,
        `${seed}:general-fill:${plan.length}`,
      );

      if (!picked) break;

      addPlanItem(plan, usedChallengeIds, {
        challenge: picked,
        selectionReason: added
          ? "adaptive_variety"
          : "fallback",
        targetSkillId: targetWeakSkillForChallenge(
          picked.id,
          measured,
          measuredMappings,
        ),
      });

      added = true;
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

  const challenges = await fetchChallenges(
    supabase,
    challengeIds,
  );

  const byId = new Map(
    challenges.map((challenge) => [
      challenge.id,
      challenge,
    ]),
  );

  const orderedChallenges = (assignments ?? [])
    .map((row) => byId.get(row.challenge_id))
    .filter(
      (
        challenge,
      ): challenge is ChallengeRow =>
        Boolean(challenge),
    );

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

  const { data: existing, error: existingError } =
    await supabase
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

  const plan = await buildDailyPlan(
    supabase,
    userId,
    count,
    day,
  );

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

  const { data: created, error: createError } =
    await admin
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
      const { data: raced, error: racedError } =
        await supabase
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

  const assignmentRows = plan.map(
    (item, index) => ({
      session_id: created.id,
      position: index + 1,
      challenge_id: item.challenge.id,
      selection_reason: item.selectionReason,
      target_skill_id: item.targetSkillId,
    }),
  );

  const { error: assignmentError } = await admin
    .from("training_session_challenges")
    .insert(assignmentRows);

  if (assignmentError) {
    await admin
      .from("training_sessions")
      .delete()
      .eq("id", created.id);

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
