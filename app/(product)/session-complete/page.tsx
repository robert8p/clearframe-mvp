import Link from "next/link";
import { requireUser } from "@/lib/auth";

function getSkillName(value: any) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export default async function SessionCompletePage() {
  const { user, supabase } = await requireUser();

  const [{ data: profile }, { data: scores }] = await Promise.all([
    supabase.from("profiles").select("xp,current_streak").eq("id", user.id).single(),
    supabase.from("user_skill_scores").select("score,attempts,skills(name)").eq("user_id", user.id).gt("attempts", 0).order("score"),
  ]);

  const weakest = scores?.[0];
  const strongest = scores?.[(scores?.length ?? 1) - 1];

  return (
    <>
      <div className="cg-kicker">Results</div>
      <h1>Excellent.</h1>
      <p>Your session is complete. Keep stacking evidence, not just effort.</p>

      <div className="cg-grid three">
        <section className="cg-card"><div className="cg-kicker">Score</div><div className="cg-stat">+ XP</div><p>Total XP: {profile?.xp ?? 0}</p></section>
        <section className="cg-card"><div className="cg-kicker">Streak</div><div className="cg-stat">{profile?.current_streak ?? 0}</div><p>Keep the daily habit alive.</p></section>
        <section className="cg-card"><div className="cg-kicker">Personal insight</div><p>{weakest ? `Keep focusing on ${getSkillName(weakest.skills)} while protecting your strength in ${getSkillName(strongest?.skills)}.` : "Complete more sessions to unlock a grounded insight."}</p></section>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/dashboard" className="cg-button">Back to home</Link>
        <Link href="/skills" className="cg-button secondary">Review skills</Link>
      </div>
    </>
  );
}
