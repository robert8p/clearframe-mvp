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

function effectiveScore(row: ScoreRow) { const r = Math.max(0, Math.min(1, Number(row.reliability ?? 0))); return 50 + (Number(row.score) - 50) * r; }
function hash(text: string) { let h = 2166136261; for (let i=0;i<text.length;i+=1){ h ^= text.charCodeAt(i); h = Math.imul(h,16777619); } return h>>>0; }
function rank(rows: ChallengeRow[], target: number, seed: string) { return [...rows].sort((a,b)=> Math.abs(a.difficulty-target)-Math.abs(b.difficulty-target) || hash(`${seed}:${a.id}`)-hash(`${seed}:${b.id}`)); }

async function loadSession(supabase: SupabaseClient, userId: string, session: { id: string; session_date: string; status: "in_progress" | "completed" }): Promise<DailyTrainingSession> {
  const [{ data: assignments, error: ae }, { data: responses, error: re }] = await Promise.all([
    supabase.from("training_session_challenges").select("challenge_id,position").eq("session_id", session.id).order("position"),
    supabase.from("user_responses").select("challenge_id").eq("user_id", userId).eq("session_key", session.id),
  ]);
  if (ae) throw ae; if (re) throw re;
  const ids = (assignments ?? []).map((row: {challenge_id:string})=>row.challenge_id);
  const { data, error } = ids.length ? await supabase.from("challenges").select(FIELDS).in("id", ids).eq("is_published", true) : { data: [], error: null };
  if (error) throw error;
  const byId = new Map(((data ?? []) as ChallengeRow[]).map((c)=>[c.id,c]));
  return { id: session.id, sessionDate: session.session_date, status: session.status, challenges: ids.map((id)=>byId.get(id)).filter((x): x is ChallengeRow=>Boolean(x)), answeredChallengeIds: (responses ?? []).map((row:{challenge_id:string})=>row.challenge_id) };
}

async function buildPlan(supabase: SupabaseClient, userId: string, audience: AudienceSegment, count: number, day: string): Promise<Assignment[]> {
  const [{ data: scores }, { data: history }, { data: mappings }, { data: challengeRows }] = await Promise.all([
    supabase.from("user_skill_scores").select("skill_id,score,reliability,attempts").eq("user_id", userId),
    supabase.from("user_responses").select("challenge_id").eq("user_id", userId).order("created_at", {ascending:false}).limit(20),
    supabase.from("challenge_skill_mapping").select("challenge_id,skill_id").limit(1000),
    supabase.from("challenges").select(FIELDS).eq("is_published", true).eq("is_diagnostic", false).limit(400),
  ]);
  const recent = new Set((history ?? []).map((r:{challenge_id:string})=>r.challenge_id));
  const eligible = ((challengeRows ?? []) as ChallengeRow[]).filter((c)=>audienceMatches(c.audience_segments,audience) && !recent.has(c.id));
  const fallbackEligible = eligible.length >= count ? eligible : ((challengeRows ?? []) as ChallengeRow[]).filter((c)=>audienceMatches(c.audience_segments,audience));
  const measured = ((scores ?? []) as ScoreRow[]).filter((s)=>s.attempts>0).sort((a,b)=>effectiveScore(a)-effectiveScore(b));
  const map = new Map<string,string[]>();
  for (const m of mappings ?? []) map.set(m.skill_id,[...(map.get(m.skill_id)??[]),m.challenge_id]);
  const used = new Set<string>(); const plan: Assignment[]=[];
  const targetScore = measured[0] ? effectiveScore(measured[0]) : 50;
  const targetDifficulty = audienceDifficultyTarget(audience,targetScore);
  function choose(pool: ChallengeRow[], reason: Assignment["reason"], skillId: string|null, seed:string){
    const available = pool.filter((c)=>!used.has(c.id)); if(!available.length) return;
    const formats = new Map<string,number>(); for(const p of plan) formats.set(p.challenge.interaction_type,(formats.get(p.challenge.interaction_type)??0)+1);
    const minFormat = Math.min(...available.map((c)=>formats.get(c.interaction_type)??0));
    const diverse = available.filter((c)=>(formats.get(c.interaction_type)??0)===minFormat);
    const picked=rank(diverse.length?diverse:available,targetDifficulty,`${userId}:${day}:${seed}`)[0]; if(!picked)return;
    used.add(picked.id); plan.push({challenge:picked,reason,skillId});
  }
  for (const skill of measured.slice(0,2)) {
    const ids=new Set(map.get(skill.skill_id)??[]); const specific=fallbackEligible.filter((c)=>ids.has(c.id) && c.audience_segments?.includes(audience)); const pool=specific.length?specific:fallbackEligible.filter((c)=>ids.has(c.id));
    choose(pool,"weakest_measured",skill.skill_id,`skill:${skill.skill_id}`); if(plan.length>=count) break;
  }
  if(plan.length<count) choose(fallbackEligible.filter((c)=>c.challenge_type==="ai_answer_audit"),"ai_verification",null,"ai");
  while(plan.length<count){ const before=plan.length; const specific=fallbackEligible.filter((c)=>c.audience_segments?.includes(audience)); choose(specific.length?specific:fallbackEligible,"adaptive_variety",null,`fill:${plan.length}`); if(plan.length===before) break; }
  return plan.slice(0,count);
}

export async function getOrCreateDailyTrainingSession(supabase: SupabaseClient, userId: string, count=5): Promise<DailyTrainingSession> {
  const day=localDateKey();
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
