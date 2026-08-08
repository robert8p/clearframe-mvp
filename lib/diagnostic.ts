import type { SupabaseClient } from "@supabase/supabase-js";
import { isAudienceSegment } from "@/lib/audience";

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type DiagnosticResponse={challenge_id:string;session_key:string|null;created_at:string};
type DiagnosticRow={id:string;sort_order:number;diagnostic_role:string|null;audience_segments:string[]|null};
type SessionGroup={sessionKey:string;answeredChallengeIds:string[];latestAt:string};
export type DiagnosticProgress={challengeIds:string[];challengeCount:number;completedSessionKey:string|null;resumableSessionKey:string|null;answeredChallengeIds:string[]};

function buildCurrentIds(rows: DiagnosticRow[], audience: string | null) {
  const ordered=[...rows].sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
  const core=ordered.filter((row)=>row.diagnostic_role==="core").slice(0,7);
  const applied=isAudienceSegment(audience) ? ordered.filter((row)=>row.diagnostic_role==="audience_applied" && row.audience_segments?.includes(audience)).slice(0,5) : [];
  const picked=[...core,...applied];
  const used=new Set(picked.map((row)=>row.id));
  for(const row of ordered){ if(picked.length>=12) break; if(!used.has(row.id) && row.diagnostic_role!=="audience_applied"){picked.push(row);used.add(row.id);} }
  return picked.slice(0,12).map((row)=>row.id);
}
function legacyIds(rows: DiagnosticRow[]) { return [...rows].filter((row)=>row.diagnostic_role==="core"||row.diagnostic_role==="legacy").sort((a,b)=>Number(a.sort_order)-Number(b.sort_order)).slice(0,12).map((row)=>row.id); }

export async function getDiagnosticProgress(supabase: SupabaseClient,userId:string,knownChallengeIds?:string[]):Promise<DiagnosticProgress>{
  const [{data:profile,error:profileError},{data:definition,error:definitionError}]=await Promise.all([
    supabase.from("profiles").select("audience_segment").eq("id",userId).single(),
    supabase.from("challenges").select("id,sort_order,diagnostic_role,audience_segments").eq("is_published",true).eq("is_diagnostic",true).order("sort_order"),
  ]);
  if(profileError)throw profileError;if(definitionError)throw definitionError;
  const rows=(definition??[]) as DiagnosticRow[];
  const allIds=rows.map((row)=>row.id);
  let currentIds=knownChallengeIds?.length?knownChallengeIds:buildCurrentIds(rows,profile?.audience_segment??null);
  if(!currentIds.length)return{challengeIds:[],challengeCount:0,completedSessionKey:null,resumableSessionKey:null,answeredChallengeIds:[]};

  const {data,error}=await supabase.from("user_responses").select("challenge_id,session_key,created_at").eq("user_id",userId).in("challenge_id",allIds).order("created_at",{ascending:false}).limit(1200);
  if(error)throw error;
  const allSet=new Set(allIds), grouped=new Map<string,{answered:Set<string>;latestAt:string}>();
  for(const row of (data??[]) as DiagnosticResponse[]){const key=String(row.session_key??"");if(!UUID_RE.test(key)||!allSet.has(row.challenge_id))continue;const existing=grouped.get(key)??{answered:new Set<string>(),latestAt:row.created_at};existing.answered.add(row.challenge_id);if(row.created_at>existing.latestAt)existing.latestAt=row.created_at;grouped.set(key,existing);}
  const sessions:SessionGroup[]=[...grouped.entries()].map(([sessionKey,value])=>({sessionKey,answeredChallengeIds:[...value.answered],latestAt:value.latestAt})).sort((a,b)=>b.latestAt.localeCompare(a.latestAt));

  // Any historical 12-question diagnostic remains complete even if the current audience-aware definition differs.
  const completed=sessions.find((session)=>session.answeredChallengeIds.length>=12)??null;
  if(completed)return{challengeIds:currentIds,challengeCount:currentIds.length,completedSessionKey:completed.sessionKey,resumableSessionKey:null,answeredChallengeIds:completed.answeredChallengeIds};

  const partial=sessions.find((session)=>session.answeredChallengeIds.length>0)??null;
  if(partial && !knownChallengeIds){
    const legacy=new Set(legacyIds(rows));
    const hasLegacyOnly=partial.answeredChallengeIds.some((id)=>legacy.has(id)&&!currentIds.includes(id));
    if(hasLegacyOnly) currentIds=legacyIds(rows);
  }
  const currentSet=new Set(currentIds);
  const currentAnswered=partial?.answeredChallengeIds.filter((id)=>currentSet.has(id))??[];
  return{challengeIds:currentIds,challengeCount:currentIds.length,completedSessionKey:null,resumableSessionKey:partial?.sessionKey??null,answeredChallengeIds:currentAnswered};
}
