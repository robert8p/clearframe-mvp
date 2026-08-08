import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SkillBars } from "@/components/SkillBars";

export default async function Results(){
  const {user,supabase}=await requireUser();
  const {data}=await supabase.from("user_skill_scores").select("score,reliability,skills(name,slug)").eq("user_id",user.id).order("score");
  return <><div className="kicker">Diagnostic complete</div><h1>Your judgement profile</h1><p className="muted">These are adaptive development scores, not validated percentiles. Reliability grows as you answer more items.</p><SkillBars rows={(data??[]) as never[]}/><div style={{marginTop:18}}><Link className="button" href="/training">Start personalised training</Link></div></>;
}
