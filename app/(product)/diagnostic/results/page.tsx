import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SkillBars } from "@/components/SkillBars";

function getSkillName(value: any) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export default async function Results() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("user_skill_scores")
    .select("score,reliability,attempts,skills(name,slug)")
    .eq("user_id", user.id)
    .order("score");

  const measured = (data ?? []).filter((row: any) => (row.attempts ?? 0) > 0);
  const strengths = measured.slice(-3).reverse();
  const priorities = measured.slice(0, 3);
  const avgReliability = measured.length
    ? Math.round(measured.reduce((sum: number, row: any) => sum + (row.reliability ?? 0), 0) / measured.length * 100)
    : 0;

  return (
    <>
      <div className="kicker">Diagnostic complete</div>
      <h1>Your Cogni profile</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        These are adaptive development scores, not validated percentiles. Reliability grows as you answer more items.
      </p>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="kicker">Strongest measured area</div>
          <h2 style={{ marginTop: 10 }}>{getSkillName(strengths[0]?.skills) ?? "Not enough evidence yet"}</h2>
          <p>{strengths[0] ? `Development score ${Math.round(strengths[0].score)}.` : "Complete more challenges to build your profile."}</p>
        </section>
        <section className="card">
          <div className="kicker">Highest-value development area</div>
          <h2 style={{ marginTop: 10 }}>{getSkillName(priorities[0]?.skills) ?? "Not enough evidence yet"}</h2>
          <p>{priorities[0] ? `Development score ${Math.round(priorities[0].score)}.` : "We need more measured responses first."}</p>
        </section>
        <section className="card">
          <div className="kicker">Evidence confidence</div>
          <div className="stat">{avgReliability}%</div>
          <p className="muted">Early estimates are useful, but still provisional.</p>
        </section>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="kicker">Emerging strengths</div>
          <div className="section-stack" style={{ marginTop: 12 }}>
            {strengths.length ? strengths.map((row: any, index: number) => (
              <div key={index} className="pill" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{getSkillName(row.skills)}</span>
                <strong>{Math.round(row.score)}</strong>
              </div>
            )) : <p className="muted">Not enough measured data yet.</p>}
          </div>
        </section>
        <section className="card">
          <div className="kicker">Recommended pathway</div>
          <p>
            Start by improving {getSkillName(priorities[0]?.skills) ?? "your weakest measured skill"}, then reinforce {getSkillName(priorities[1]?.skills) ?? "your next development area"} and keep AI-output evaluation active in every session.
          </p>
        </section>
      </div>

      <div style={{ marginTop: 18 }}>
        <SkillBars rows={(data ?? []) as never[]} />
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="button" href="/training">Start personalised training</Link>
        <Link className="button secondary" href="/skills">View all skills</Link>
      </div>
    </>
  );
}
