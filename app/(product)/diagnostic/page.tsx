import { requireUser } from "@/lib/auth";
import { ChallengeRunner } from "@/components/ChallengeRunner";

export default async function DiagnosticPage(){
  const { supabase }=await requireUser();
  const {data}=await supabase.from("challenges").select("id,title,prompt,options,challenge_type,difficulty,confidence_required").eq("is_published",true).eq("is_diagnostic",true).order("sort_order").limit(12);
  return <ChallengeRunner challenges={(data??[]) as never[]} mode="diagnostic"/>;
}
