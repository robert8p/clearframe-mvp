import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextSkillScore, reliabilityFromAttempts } from "@/lib/scoring";

const Input=z.object({challengeId:z.string().uuid(),selectedIndex:z.number().int().min(0).max(10),confidence:z.number().min(0).max(100).optional(),responseTimeMs:z.number().int().min(0).max(3600000),mode:z.enum(["diagnostic","training"]),sessionId:z.string().uuid()});

export async function POST(req:Request){
 try{
  const body=Input.parse(await req.json()); const userClient=await createClient(); const {data:{user}}=await userClient.auth.getUser(); if(!user)return NextResponse.json({error:"Unauthorised"},{status:401});
  const admin=createAdminClient();
  const [{data:challenge},{data:key},{data:mappings}]=await Promise.all([
   admin.from("challenges").select("id,difficulty,is_diagnostic").eq("id",body.challengeId).eq("is_published",true).single(),
   admin.from("challenge_answer_keys").select("correct_index,explanation,thinking_principle,application,error_patterns").eq("challenge_id",body.challengeId).single(),
   admin.from("challenge_skill_mapping").select("skill_id,weight,skills(slug)").eq("challenge_id",body.challengeId)
  ]);
  if(!challenge||!key)return NextResponse.json({error:"Challenge not found"},{status:404});
  const correct=body.selectedIndex===key.correct_index; const pattern=correct?null:(key.error_patterns?.[String(body.selectedIndex)]??"premature_closure");
  const {data:existing}=await admin.from("user_responses").select("id").eq("user_id",user.id).eq("challenge_id",body.challengeId).eq("session_key",body.sessionId).maybeSingle();
  if(existing)return NextResponse.json({error:"This challenge has already been submitted in this session."},{status:409});
  await admin.from("user_responses").insert({user_id:user.id,challenge_id:body.challengeId,selected_index:body.selectedIndex,is_correct:correct,confidence:body.confidence??null,response_time_ms:body.responseTimeMs,error_pattern:pattern,session_key:body.sessionId});
  const updates=[] as {slug:string;score:number;reliability:number}[];
  for(const m of mappings??[]){
   const {data:old}=await admin.from("user_skill_scores").select("score,attempts").eq("user_id",user.id).eq("skill_id",m.skill_id).maybeSingle();
   const attempts=(old?.attempts??0)+1; const score=nextSkillScore(old?.score??50,challenge.difficulty,correct,Boolean(challenge.is_diagnostic),m.weight??1); const reliability=reliabilityFromAttempts(attempts);
   await admin.from("user_skill_scores").upsert({user_id:user.id,skill_id:m.skill_id,score,reliability,attempts,last_seen_at:new Date().toISOString()},{onConflict:"user_id,skill_id"});
   const skill=Array.isArray(m.skills)?m.skills[0]:m.skills; updates.push({slug:skill?.slug??"skill",score,reliability});
  }
  if(pattern){const {data:ep}=await admin.from("user_error_patterns").select("id,count").eq("user_id",user.id).eq("pattern",pattern).maybeSingle(); if(ep)await admin.from("user_error_patterns").update({count:ep.count+1,last_seen_at:new Date().toISOString()}).eq("id",ep.id);else await admin.from("user_error_patterns").insert({user_id:user.id,pattern,count:1});}
  const xp=correct?12:7; const today=new Date().toISOString().slice(0,10); const {data:p}=await admin.from("profiles").select("xp,current_streak,last_session_date").eq("id",user.id).single();
  let streak=p?.current_streak??0; const last=p?.last_session_date; if(last!==today){const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);streak=last===yesterday?streak+1:1;}
  await admin.from("profiles").update({xp:(p?.xp??0)+xp,current_streak:streak,last_session_date:today}).eq("id",user.id);
  await admin.from("analytics_events").insert([{user_id:user.id,event_name:"answer_submitted",properties:{challenge_id:body.challengeId,mode:body.mode,session_id:body.sessionId,confidence:body.confidence,response_time_ms:body.responseTimeMs}},{user_id:user.id,event_name:correct?"answer_correct":"answer_incorrect",properties:{challenge_id:body.challengeId,mode:body.mode,session_id:body.sessionId,confidence:body.confidence,response_time_ms:body.responseTimeMs}}]);
  return NextResponse.json({correct,correctIndex:key.correct_index,explanation:key.explanation,thinkingPrinciple:key.thinking_principle,application:key.application,errorPattern:pattern,skillUpdates:updates,xpEarned:xp});
 }catch(e){console.error(e);return NextResponse.json({error:e instanceof Error?e.message:"Invalid request"},{status:400});}
}
