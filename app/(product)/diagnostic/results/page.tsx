import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SkillBars } from "@/components/SkillBars";

function getSkillName(value: any) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export default async function DiagnosticResultsPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).order("score");

  const measured = (data ?? []).filter((row: any) => (row.attempts ?? 0) > 0);
  const strongest = measured[measured.length - 1];
  const weakest = measured[0];
  const avgReliability = measured.length ? Math.round(measured.reduce((sum: number, row: any) => sum + (row.reliability ?? 0), 0) / measured.length * 100) : 0;

  return (
    <>
      <div className="cg-kicker">Diagnostic complete</div>
      <h1>Your Cogni profile</h1>
      <p>These are adaptive development scores. Reliability grows as you answer more items.</p>

      <div className="cg-grid three" style={{ marginTop: 18 }}>
        <section className="cg-card"><div className="cg-kicker">Emerging strength</div><h2 style={{ marginTop: 10 }}>{getSkillName(strongest?.skills) ?? "Not enough evidence"}</h2><p>{strongest ? `Current score ${Math.round(strongest.score)}.` : "Complete more challenges to reveal your strengths."}</p></section>
        <section className="cg-card"><div className="cg-kicker">Highest-value development area</div><h2 style={{ marginTop: 10 }}>{getSkillName(weakest?.skills) ?? "Not enough evidence"}</h2><p>{weakest ? `Current score ${Math.round(weakest.score)}.` : "We need more observed performance first."}</p></section>
        <section className="cg-card"><div className="cg-kicker">Evidence confidence</div><div className="cg-stat">{avgReliability}%</div><p>Useful now, but still early.</p></section>
      </div>

      <div style={{ marginTop: 18 }}><SkillBars rows={(data ?? []) as never[]} /></div>

      <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/training" className="cg-button">Start personalised training</Link>
        <Link href="/skills" className="cg-button secondary">View skills</Link>
      </div>
    </>
  );
}
