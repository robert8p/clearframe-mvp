import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CoachCard } from "@/components/CoachCard";
export default async function Dashboard(){
 const {user,supabase}=await requireUser();
 const [{data:p},{data:scores},{count:responses}]=await Promise.all([
  supabase.from("profiles").select("full_name,xp,current_streak,last_session_date").eq("id",user.id).single(),
  supabase.from("user_skill_scores").select("score,skills(name)").eq("user_id",user.id).order("score").limit(3),
  supabase.from("user_responses").select("id",{count:"exact",head:true}).eq("user_id",user.id)
 ]);
 const weakest=scores?.[0]; const skill=Array.isArray(weakest?.skills)?weakest?.skills[0]:weakest?.skills;
 return <><div className="topbar"><div><div className="kicker">Today</div><h1>{p?.full_name?`Welcome back, ${p.full_name.split(" ")[0]}`:"Build better judgement"}</h1></div><Link className="button" href={responses?"/training":"/onboarding"}>{responses?"Start today’s session":"Take diagnostic"}</Link></div>
 <div className="grid grid-3"><div className="card"><div className="kicker">Streak</div><div className="stat">{p?.current_streak??0}</div><p className="muted">days</p></div><div className="card"><div className="kicker">XP</div><div className="stat">{p?.xp??0}</div><p className="muted">earned</p></div><div className="card"><div className="kicker">Highest-value focus</div><div className="stat" style={{fontSize:21}}>{skill?.name??"Complete diagnostic"}</div><p className="muted">{weakest?`Development score ${Math.round(weakest.score)}`:"We need evidence before personalising."}</p></div></div>
 <section className="card" style={{marginTop:16}}><h2>Today’s training logic</h2><p className="muted">Your session prioritises weaker capabilities, then mixes in AI-output evaluation and spaced reinforcement. It does not reward raw speed; response time is stored as diagnostic evidence rather than treated as intelligence.</p></section><CoachCard/></>;
}
