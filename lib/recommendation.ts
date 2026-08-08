import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey } from "@/lib/dates";
import { audienceDifficultyTarget, audienceMatches, isAudienceSegment, type AudienceSegment } from "@/lib/audience";

type ChallengeRow = {
  id: string; title: string; prompt: string; options: string[]; challenge_type: string;
  interaction_type: string; interaction_config: Record<string, unknown>; difficulty: number;
  confidence_required: boolean; audience_segments: string[]; scenario_context: string | null;
};
type ScoreRow = { skill_id: string; score: number; reliability: number; attempts: number };
type Assignment = { challenge: ChallengeRow; reason: "weakest_measured" | "ai_verification" | "adaptive_variety" | "fallback"; skillId: string | null };
export type DailyTrainingSession = { id: string | null; sessionDate: string; status: "in_progress" | "completed"; challenges: ChallengeRow[]; answeredChallengeIds: string[] };
const FIELDS = "id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context";

function effectiveScore(row: ScoreRow) { const reliability = Math.max(0, Math.min(1, Number(row.reliability ?? 0))); return 50 + (Number(row.score) - 50) * reliability; }
function hash(text: string) { let value = 2166136261; for (let index = 0; index < text.length; index += 1) { value ^= text.charCodeAt(index); value = Math.imul(value, 16777619); } return value >>> 0; }
function promptKey(value: string) { return value.trim().toLowerCase().replace(/\s+/g, " "); }
function scenarioKey(value: string | null) { return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? null; }
function rank(rows: ChallengeRow[], target: number, seed: string, recentPrompts: Set<string>) {
  return [...rows].sort((a, b) => {
    const recentA = recentPrompts.has(promptKey(a.prompt)) ? 1 : 0;
    const recentB = recentPrompts.has(promptKey(b.prompt)) ? 1 : 0;
    if (recentA !== recentB) return recentA - recentB;
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
  return { id: session.id, sessionDate: session.session_date, status: session.status, challenges: ids.map((id) => byId.get(id)).filter((value): value is ChallengeRow => Boolean(value)), answeredChallengeIds: (responses ?? []).map((row: { challenge_id: string }) => row.challenge_id) };
}

async function buildPlan(supabase: SupabaseClient, userId: string, audience: AudienceSegment, count: number, day: string): Promise<Assignment[]> {
  const [{ data: scores }, { data: history }, { data: mappings }, { data: challengeRows }, { data: answerRows }] = await Promise.all([
    supabase.from("user_skill_scores").select("skill_id,score,reliability,attempts").eq("user_id", userId),
    supabase.from("user_responses").select("challenge_id").eq("user_id", userId).limit(5000),
    supabase.from("challenge_skill_mapping").select("challenge_id,skill_id").limit(3000),
    supabase.from("challenges").select(FIELDS).eq("is_published", true).eq("is_diagnostic", false).limit(2000),
    supabase.from("challenge_answer_keys").select("challenge_id,correct_index").not("correct_index", "is", null).limit(3000),
  ]);

  const allChallenges = (challengeRows ?? []) as ChallengeRow[];
  const historyIds = new Set((history ?? []).map((row: { challenge_id: string }) => row.challenge_id));
  const promptById = new Map(allChallenges.map((challenge) => [challenge.id, promptKey(challenge.prompt)]));
  const recentPrompts = new Set<string>();
  for (const id of historyIds) { const key = promptById.get(id); if (key) recentPrompts.add(key); }
  const correctIndexByChallenge = new Map<string, number>();
  for (const row of answerRows ?? []) {
    const position = Number(row.correct_index);
    if (position >= 0 && position <= 3) correctIndexByChallenge.set(String(row.challenge_id), position);
  }

  const audienceEligible = allChallenges.filter((challenge) => audienceMatches(challenge.audience_segments, audience));
  const freshEligible = audienceEligible.filter((challenge) => !historyIds.has(challenge.id) && !recentPrompts.has(promptKey(challenge.prompt)));
  const preferredEligible = freshEligible.length >= count ? freshEligible : audienceEligible;
  const measured = ((scores ?? []) as ScoreRow[]).filter((score) => score.attempts > 0).sort((a, b) => effectiveScore(a) - effectiveScore(b));
  const skillMap = new Map<string, string[]>();
  for (const mapping of mappings ?? []) skillMap.set(mapping.skill_id, [...(skillMap.get(mapping.skill_id) ?? []), mapping.challenge_id]);

  const usedIds = new Set<string>();
  const usedPrompts = new Set<string>();
  const usedScenarios = new Set<string>();
  const mcqPositionCounts = [0, 0, 0, 0];
  const plan: Assignment[] = [];
  const targetScore = measured[0] ? effectiveScore(measured[0]) : 50;
  const targetDifficulty = audienceDifficultyTarget(audience, targetScore);

  function choose(pool: ChallengeRow[], reason: Assignment["reason"], skillId: string | null, seed: string) {
    const availableAnyScenario = pool.filter((challenge) => !usedIds.has(challenge.id) && !usedPrompts.has(promptKey(challenge.prompt)));
    if (!availableAnyScenario.length) return;
    const scenarioFresh = availableAnyScenario.filter((challenge) => {
      const key = scenarioKey(challenge.scenario_context);
      return !key || !usedScenarios.has(key);
    });
    const available = scenarioFresh.length ? scenarioFresh : availableAnyScenario;
    const formats = new Map<string, number>();
    for (const item of plan) formats.set(item.challenge.interaction_type, (formats.get(item.challenge.interaction_type) ?? 0) + 1);
    const minimumFormatUse = Math.min(...available.map((challenge) => formats.get(challenge.interaction_type) ?? 0));
    const diverse = available.filter((challenge) => (formats.get(challenge.interaction_type) ?? 0) === minimumFormatUse);
    const ranked = rank(diverse.length ? diverse : available, targetDifficulty, `${userId}:${day}:${seed}`, recentPrompts);
    let picked = ranked[0];

    if (picked?.interaction_type === "single_choice") {
      const mcqs = ranked.filter((challenge) => challenge.interaction_type === "single_choice").slice(0, 12);
      const balanced = [...mcqs].sort((a, b) => {
        const ai = correctIndexByChallenge.get(a.id);
        const bi = correctIndexByChallenge.get(b.id);
        const ac = ai === undefined ? 99 : mcqPositionCounts[ai];
        const bc = bi === undefined ? 99 : mcqPositionCounts[bi];
        return ac - bc || mcqs.indexOf(a) - mcqs.indexOf(b);
      })[0];
      if (balanced) picked = balanced;
    }

    if (!picked) return;
    usedIds.add(picked.id);
    usedPrompts.add(promptKey(picked.prompt));
    const pickedScenario = scenarioKey(picked.scenario_context);
    if (pickedScenario) usedScenarios.add(pickedScenario);
    if (picked.interaction_type === "single_choice") {
      const position = correctIndexByChallenge.get(picked.id);
      if (position !== undefined) mcqPositionCounts[position] += 1;
    }
    plan.push({ challenge: picked, reason, skillId });
  }

  for (const skill of measured.slice(0, 2)) {
    const ids = new Set(skillMap.get(skill.skill_id) ?? []);
    const specificFresh = freshEligible.filter((challenge) => ids.has(challenge.id) && challenge.audience_segments?.includes(audience));
    const specificAny = preferredEligible.filter((challenge) => ids.has(challenge.id) && challenge.audience_segments?.includes(audience));
    const general = preferredEligible.filter((challenge) => ids.has(challenge.id));
    choose(specificFresh.length ? specificFresh : specificAny.length ? specificAny : general, "weakest_measured", skill.skill_id, `skill:${skill.skill_id}`);
    if (plan.length >= count) break;
  }

  if (plan.length < count) choose(preferredEligible.filter((challenge) => challenge.challenge_type === "ai_answer_audit"), "ai_verification", null, "ai");
  while (plan.length < count) {
    const before = plan.length;
    const specificFresh = freshEligible.filter((challenge) => challenge.audience_segments?.includes(audience));
    const specificAny = preferredEligible.filter((challenge) => challenge.audience_segments?.includes(audience));
    choose(specificFresh.length ? specificFresh : specificAny.length ? specificAny : preferredEligible, "adaptive_variety", null, `fill:${plan.length}`);
    if (plan.length === before) break;
  }
  return plan.slice(0, count);
}

export async function getOrCreateDailyTrainingSession(supabase: SupabaseClient, userId: string, count = 5): Promise<DailyTrainingSession> {
  const day = localDateKey();
  const [{data:profile,error:pe},{data:existing,error:ee}] = await Promise.all([
    supabase.from("profiles").select("audience_segment").eq("id",userId).single(),
    supabase.from("training_sessions").select("id,session_date,status").eq("user_id",userId).eq("session_date",day).maybeSingle(),
  ]);
  if(pe)throw pe; if(ee)throw ee;
  if(existing) return loadSession(supabase,userId,existing as {id:string;session_date:string;status:"in_progress"|"completed"});
  if(!isAudienceSegment(profile?.audience_segment)) return {id:null,sessionDate:day,status:"in_progress",challenges:[],answeredChallengeIds:[]};
  const plan=await buildPlan(supabase,userId,profile.audience_segment,count,day);
  if(!plan.length) return {id:null,sessionDate:day,status:"in_progress",challenges:[],answeredChallengeIds:[]};
  const admin=createAdminClient();
  const {data:created,error:ce}=await admin.from("training_sessions").insert({user_id:userId,session_date:day,status:"in_progress"}).select("id,session_date,status").single();
  if(ce){ if(ce.code==="23505"){ const {data:raced,error}=await supabase.from("training_sessions").select("id,session_date,status").eq("user_id",userId).eq("session_date",day).single(); if(error)throw error; return loadSession(supabase,userId,raced as {id:string;session_date:string;status:"in_progress"|"completed"}); } throw ce; }
  const rows=plan.map((p,i)=>({session_id:created.id,position:i+1,challenge_id:p.challenge.id,selection_reason:p.reason,target_skill_id:p.skillId}));
  const {error:ae}=await admin.from("training_session_challenges").insert(rows); if(ae){await admin.from("training_sessions").delete().eq("id",created.id);throw ae;}
  return loadSession(supabase,userId,created as {id:string;session_date:string;status:"in_progress"|"completed"});
}