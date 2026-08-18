import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey } from "@/lib/dates";
import { audienceDifficultyTarget, audienceQuestionCount, isAudienceSegment, type AudienceSegment } from "@/lib/audience";
import {
  contentContextScore,
  contentEligibleForMoment,
  contextProfileFromRow,
  type ContextMoment,
  type ContextProfile,
} from "@/lib/context-profile";

type ChallengeRow = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  challenge_type: string;
  interaction_type: string;
  interaction_config: Record<string, unknown>;
  difficulty: number;
  confidence_required: boolean;
  audience_segments: string[];
  scenario_context: string | null;
  scenario_category: string | null;
  function_tags: string[];
  industry_tags: string[];
  goal_tags: string[];
  complexity_level: number | null;
};
type ScoreRow = { skill_id: string; score: number; reliability: number; attempts: number };
type Assignment = { challenge: ChallengeRow; reason: "weakest_measured" | "ai_verification" | "adaptive_variety" | "fallback"; skillId: string | null };
export type DailyTrainingSession = { id: string | null; sessionDate: string; status: "in_progress" | "completed"; challenges: ChallengeRow[]; answeredChallengeIds: string[] };

const FIELDS = "id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context,scenario_category,function_tags,industry_tags,goal_tags,complexity_level";

function effectiveScore(row: ScoreRow) {
  const reliability = Math.max(0, Math.min(1, Number(row.reliability ?? 0)));
  return 50 + (Number(row.score) - 50) * reliability;
}
function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
function promptKey(value: string) { return value.trim().toLowerCase().replace(/\s+/g, " "); }
function scenarioKey(challenge: ChallengeRow) { return (challenge.scenario_category || challenge.scenario_context)?.trim().toLowerCase().replace(/\s+/g, " ") ?? null; }
function familyPriority(challenge: ChallengeRow) {
  return challenge.challenge_type === "audience_depth" ? 4 : challenge.challenge_type === "audience_scenario" ? 3 : challenge.challenge_type === "ai_answer_audit" ? 2 : challenge.challenge_type === "story_mcq" ? 1 : 0;
}
function feedbackScenarioKeys(rows: unknown[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const properties = (row as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object") continue;
    const raw = (properties as { scenario_category?: unknown }).scenario_category;
    if (typeof raw === "string" && raw.trim()) keys.add(raw.trim().toLowerCase().replace(/\s+/g, " "));
  }
  return keys;
}
function rank(
  rows: ChallengeRow[],
  target: number,
  seed: string,
  seenPrompts: Set<string>,
  recentScenarios: Set<string>,
  dislikedScenarios: Set<string>,
  audience: AudienceSegment,
  profile: ContextProfile,
  moment?: ContextMoment,
) {
  return [...rows].sort((a, b) => {
    const seenA = seenPrompts.has(promptKey(a.prompt)) ? 1 : 0;
    const seenB = seenPrompts.has(promptKey(b.prompt)) ? 1 : 0;
    if (seenA !== seenB) return seenA - seenB;
    const scenarioA = scenarioKey(a);
    const scenarioB = scenarioKey(b);
    const dislikedA = scenarioA && dislikedScenarios.has(scenarioA) ? 1 : 0;
    const dislikedB = scenarioB && dislikedScenarios.has(scenarioB) ? 1 : 0;
    if (dislikedA !== dislikedB) return dislikedA - dislikedB;
    const recentA = scenarioA && recentScenarios.has(scenarioA) ? 1 : 0;
    const recentB = scenarioB && recentScenarios.has(scenarioB) ? 1 : 0;
    if (recentA !== recentB) return recentA - recentB;
    const contextA = contentContextScore(a, audience, profile, moment);
    const contextB = contentContextScore(b, audience, profile, moment);
    if (contextA !== contextB) return contextB - contextA;
    const familyA = familyPriority(a);
    const familyB = familyPriority(b);
    if (familyA !== familyB) return familyB - familyA;
    return Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) || hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
  });
}

async function loadSession(supabase: SupabaseClient, userId: string, session: { id: string; session_date: string; status: "in_progress" | "completed" }): Promise<DailyTrainingSession> {
  const [{ data: assignments, error: assignmentError }, { data: responses, error: responseError }] = await Promise.all([
    supabase.from("training_session_challenges").select("challenge_id,position").eq("session_id", session.id).order("position"),
    supabase.from("user_responses").select("challenge_id").eq("user_id", userId).eq("session_key", session.id),
  ]);
  if (assignmentError) throw assignmentError;
  if (responseError) throw responseError;
  const ids = (assignments ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  const { data, error } = ids.length ? await supabase.from("challenges").select(FIELDS).in("id", ids).eq("is_published", true) : { data: [], error: null };
  if (error) throw error;
  const byId = new Map(((data ?? []) as ChallengeRow[]).map((challenge) => [challenge.id, challenge]));
  return {
    id: session.id,
    sessionDate: session.session_date,
    status: session.status,
    challenges: ids.map((id) => byId.get(id)).filter((value): value is ChallengeRow => Boolean(value)),
    answeredChallengeIds: (responses ?? []).map((row: { challenge_id: string }) => row.challenge_id),
  };
}

async function buildPlan(
  supabase: SupabaseClient,
  userId: string,
  audience: AudienceSegment,
  profile: ContextProfile,
  count: number,
  day: string,
  moment?: ContextMoment,
): Promise<Assignment[]> {
  const [{ data: scores }, { data: history }, { data: mappings }, { data: challengeRows }, { data: answerRows }, { data: feedbackRows }] = await Promise.all([
    supabase.from("user_skill_scores").select("skill_id,score,reliability,attempts").eq("user_id", userId),
    supabase.from("user_responses").select("challenge_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10000),
    supabase.from("challenge_skill_mapping").select("challenge_id,skill_id").limit(6000),
    supabase.from("challenges").select(FIELDS).eq("is_published", true).eq("is_diagnostic", false).limit(3000),
    supabase.from("challenge_answer_keys").select("challenge_id,correct_index").not("correct_index", "is", null).limit(5000),
    supabase.from("analytics_events").select("properties,created_at").eq("user_id", userId).eq("event_name", "situation_not_relevant").order("created_at", { ascending: false }).limit(30),
  ]);

  const all = (challengeRows ?? []) as ChallengeRow[];
  const challengeById = new Map(all.map((challenge) => [challenge.id, challenge]));
  const historyIds = new Set((history ?? []).map((row: { challenge_id: string }) => row.challenge_id));
  const promptById = new Map(all.map((challenge) => [challenge.id, promptKey(challenge.prompt)]));
  const seenPrompts = new Set<string>();
  for (const id of historyIds) {
    const key = promptById.get(id);
    if (key) seenPrompts.add(key);
  }
  const recentScenarios = new Set<string>();
  for (const row of (history ?? []).slice(0, 24) as { challenge_id: string }[]) {
    const challenge = challengeById.get(row.challenge_id);
    const key = challenge ? scenarioKey(challenge) : null;
    if (key) recentScenarios.add(key);
  }
  const dislikedScenarios = feedbackScenarioKeys(feedbackRows ?? []);

  const correct = new Map<string, number>();
  for (const row of answerRows ?? []) {
    const position = Number(row.correct_index);
    if (position >= 0 && position <= 3) correct.set(String(row.challenge_id), position);
  }

  const eligible = all.filter((challenge) => contentEligibleForMoment(challenge, audience, moment));
  const fresh = eligible.filter((challenge) => !historyIds.has(challenge.id) && !seenPrompts.has(promptKey(challenge.prompt)));
  const preferred = fresh.length >= count ? fresh : eligible;
  const measured = ((scores ?? []) as ScoreRow[]).filter((score) => score.attempts > 0).sort((a, b) => effectiveScore(a) - effectiveScore(b));
  const skillMap = new Map<string, string[]>();
  for (const mapping of mappings ?? []) skillMap.set(mapping.skill_id, [...(skillMap.get(mapping.skill_id) ?? []), mapping.challenge_id]);

  const usedIds = new Set<string>();
  const usedPrompts = new Set<string>();
  const usedScenarios = new Set<string>();
  const mcq = [0, 0, 0, 0];
  const plan: Assignment[] = [];
  const targetScore = measured[0] ? effectiveScore(measured[0]) : 50;
  const targetDifficulty = audienceDifficultyTarget(audience, targetScore);

  function choose(pool: ChallengeRow[], reason: Assignment["reason"], skillId: string | null, seed: string) {
    const any = pool.filter((challenge) => !usedIds.has(challenge.id) && !usedPrompts.has(promptKey(challenge.prompt)));
    if (!any.length) return;
    const scenarioFresh = any.filter((challenge) => {
      const key = scenarioKey(challenge);
      return !key || !usedScenarios.has(key);
    });
    const available = scenarioFresh.length ? scenarioFresh : any;
    const formats = new Map<string, number>();
    for (const item of plan) formats.set(item.challenge.interaction_type, (formats.get(item.challenge.interaction_type) ?? 0) + 1);
    const min = Math.min(...available.map((challenge) => formats.get(challenge.interaction_type) ?? 0));
    const diverse = available.filter((challenge) => (formats.get(challenge.interaction_type) ?? 0) === min);
    const ranked = rank(diverse.length ? diverse : available, targetDifficulty, `${userId}:${day}:${seed}`, seenPrompts, recentScenarios, dislikedScenarios, audience, profile, moment);
    let picked = ranked[0];
    if (picked?.interaction_type === "single_choice") {
      const candidates = ranked.filter((challenge) => challenge.interaction_type === "single_choice").slice(0, 16);
      picked = [...candidates].sort((a, b) => {
        const answerA = correct.get(a.id);
        const answerB = correct.get(b.id);
        const countA = answerA === undefined ? 99 : mcq[answerA];
        const countB = answerB === undefined ? 99 : mcq[answerB];
        return countA - countB || candidates.indexOf(a) - candidates.indexOf(b);
      })[0] ?? picked;
    }
    if (!picked) return;
    usedIds.add(picked.id);
    usedPrompts.add(promptKey(picked.prompt));
    const key = scenarioKey(picked);
    if (key) usedScenarios.add(key);
    if (picked.interaction_type === "single_choice") {
      const position = correct.get(picked.id);
      if (position !== undefined) mcq[position] += 1;
    }
    plan.push({ challenge: picked, reason, skillId });
  }

  function bestContext(pool: ChallengeRow[]) {
    const deep = pool.filter((challenge) => contentContextScore(challenge, audience, profile, moment) >= 27);
    return deep.length ? deep : pool;
  }

  for (const skill of measured.slice(0, 2)) {
    const ids = new Set(skillMap.get(skill.skill_id) ?? []);
    const exactFresh = fresh.filter((challenge) => ids.has(challenge.id) && challenge.audience_segments?.includes(audience));
    const exactAny = preferred.filter((challenge) => ids.has(challenge.id) && challenge.audience_segments?.includes(audience));
    const general = preferred.filter((challenge) => ids.has(challenge.id));
    choose(bestContext(exactFresh.length ? exactFresh : exactAny.length ? exactAny : general), "weakest_measured", skill.skill_id, `skill:${skill.skill_id}`);
    if (plan.length >= count) break;
  }
  if (plan.length < count) choose(bestContext(preferred.filter((challenge) => challenge.challenge_type === "ai_answer_audit")), "ai_verification", null, "ai");
  while (plan.length < count) {
    const before = plan.length;
    const exactFresh = fresh.filter((challenge) => challenge.audience_segments?.includes(audience));
    const exactAny = preferred.filter((challenge) => challenge.audience_segments?.includes(audience));
    const contextual = preferred.filter((challenge) => contentEligibleForMoment(challenge, audience, moment));
    choose(bestContext(exactFresh.length && !moment ? exactFresh : exactAny.length && !moment ? exactAny : contextual), "adaptive_variety", null, `fill:${plan.length}`);
    if (plan.length === before) break;
  }
  return plan.slice(0, count);
}

export async function getOrCreateDailyTrainingSession(supabase: SupabaseClient, userId: string, count?: number, moment?: ContextMoment): Promise<DailyTrainingSession> {
  const day = localDateKey();
  const [{ data: profile, error: profileError }, { data: existing, error: existingError }] = await Promise.all([
    supabase.from("profiles").select("audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale").eq("id", userId).single(),
    supabase.from("training_sessions").select("id,session_date,status").eq("user_id", userId).eq("session_date", day).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (existingError) throw existingError;
  if (existing) return loadSession(supabase, userId, existing as { id: string; session_date: string; status: "in_progress" | "completed" });
  if (!isAudienceSegment(profile?.audience_segment)) return { id: null, sessionDate: day, status: "in_progress", challenges: [], answeredChallengeIds: [] };
  const resolvedCount = count ?? audienceQuestionCount(profile.audience_segment);
  const plan = await buildPlan(supabase, userId, profile.audience_segment, contextProfileFromRow(profile), resolvedCount, day, moment);
  if (!plan.length) return { id: null, sessionDate: day, status: "in_progress", challenges: [], answeredChallengeIds: [] };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.from("training_sessions").insert({ user_id: userId, session_date: day, status: "in_progress" }).select("id,session_date,status").single();
  if (createError) {
    if (createError.code === "23505") {
      const { data: raced, error } = await supabase.from("training_sessions").select("id,session_date,status").eq("user_id", userId).eq("session_date", day).single();
      if (error) throw error;
      return loadSession(supabase, userId, raced as { id: string; session_date: string; status: "in_progress" | "completed" });
    }
    throw createError;
  }
  const rows = plan.map((assignment, index) => ({ session_id: created.id, position: index + 1, challenge_id: assignment.challenge.id, selection_reason: assignment.reason, target_skill_id: assignment.skillId }));
  const { error: assignmentError } = await admin.from("training_session_challenges").insert(rows);
  if (assignmentError) {
    await admin.from("training_sessions").delete().eq("id", created.id);
    throw assignmentError;
  }
  return loadSession(supabase, userId, created as { id: string; session_date: string; status: "in_progress" | "completed" });
}
