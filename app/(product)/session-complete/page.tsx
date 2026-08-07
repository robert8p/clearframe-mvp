import Link from "next/link";
import { requireUser } from "@/lib/auth";

function getSkillName(value: any) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export default async function Complete() {
  const { user, supabase } = await requireUser();

  const [{ data: profile }, { data: scores }] = await Promise.all([
    supabase.from("profiles").select("xp,current_streak").eq("id", user.id).single(),
    supabase
      .from("user_skill_scores")
      .select("score,reliability,attempts,skills(name)")
      .eq("user_id", user.id)
      .gt("attempts", 0)
      .order("score"),
  ]);

  const weakest = scores?.[0];
  const strongest = scores?.[scores.length - 1];

  return (
    <>
      <div className="kicker">Session complete</div>
      <h1>Excellent. Keep compounding.</h1>

      <div className="grid grid-3">
        <section className="card">
          <div className="kicker">Total XP</div>
          <div className="stat">{profile?.xp ?? 0}</div>
        </section>
        <section className="card">
          <div className="kicker">Current streak</div>
          <div className="stat">{profile?.current_streak ?? 0} days</div>
        </section>
        <section className="card">
          <div className="kicker">Personalised insight</div>
          <p>
            {weakest
              ? `You should keep focusing on ${getSkillName(weakest.skills)}. Your strongest current measured area is ${getSkillName(strongest?.skills)}.`
              : "Complete more sessions to unlock a better grounded insight."}
          </p>
        </section>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="button" href="/dashboard">Back to dashboard</Link>
        <Link className="button secondary" href="/skills">Review skills</Link>
      </div>
    </>
  );
}
