import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ChallengeRunner } from "@/components/ChallengeRunner";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import type { Challenge } from "@/lib/types";
import { audienceMeta, isAudienceSegment } from "@/lib/audience";

export const dynamic="force-dynamic";
export default async function DiagnosticPage(){
 const {user,supabase}=await requireUser();
 const {data:profile}=await supabase.from("profiles").select("audience_segment").eq("id",user.id).single();
 if(!isAudienceSegment(profile?.audience_segment))redirect("/onboarding/audience");
 const progress=await getDiagnosticProgress(supabase,user.id);
 if(progress.completedSessionKey)redirect("/diagnostic/results");
 const {data,error}=progress.challengeIds.length?await supabase.from("challenges").select("id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,scenario_context,audience_segments").in("id",progress.challengeIds).eq("is_published",true):{data:[],error:null};
 if(error)throw error;
 const byId=new Map(((data??[]) as Challenge[]).map((challenge)=>[challenge.id,challenge]));
 const challenges=progress.challengeIds.map((id)=>byId.get(id)).filter((value):value is Challenge=>Boolean(value));
 if(challenges.length!==progress.challengeIds.length)return <div className="cg-mobile-page cg-state-view"><div className="cg-state-icon">↻</div><div className="cg-kicker">Starting check unavailable</div><h1 className="cg-screen-title">We couldn’t load your starting questions.</h1><p>Nothing has been lost. Go back to setup and try again.</p><Link className="cg-button cg-full" href="/onboarding">Back to setup</Link><Link className="cg-button secondary cg-full" href="/support">Get help</Link></div>;
 const sessionId=progress.resumableSessionKey??randomUUID();
 const audience=audienceMeta(profile.audience_segment);
 return <ChallengeRunner challenges={challenges} mode="diagnostic" sessionId={sessionId} initialAnsweredChallengeIds={progress.answeredChallengeIds} modeLabel={`${audience?.shortLabel??"Personalised"} starting check`} />;
}
