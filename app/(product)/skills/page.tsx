import { requireUser } from "@/lib/auth";
import { SkillBars } from "@/components/SkillBars";

export default async function Skills() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("user_skill_scores")
    .select("score,reliability,attempts,skills(name,slug)")
    .eq("user_id", user.id)
    .order("score");

  const measuredCount = (data ?? []).filter((row: any) => (row.attempts ?? 0) > 0).length;

  return (
    <>
      <div className="kicker">Capability profile</div>
      <h1>Your development scores</h1>
      <p className="muted" style={{ maxWidth: 780 }}>
        Scores update from observed performance. Reliability is shown separately so early estimates are not presented with false precision.
      </p>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="kicker">Measured skills</div>
          <div className="stat">{measuredCount}</div>
          <p className="muted">Capabilities with real observed evidence behind them.</p>
        </section>
        <section className="card">
          <div className="kicker">Not yet measured</div>
          <div className="stat">{Math.max((data ?? []).length - measuredCount, 0)}</div>
          <p className="muted">These will be explored over time rather than mislabeled as weaknesses.</p>
        </section>
        <section className="card">
          <div className="kicker">Interpretation</div>
          <p>Use the profile to guide training priorities, not as a fixed identity statement.</p>
        </section>
      </div>

      <div style={{ marginTop: 18 }}>
        <SkillBars rows={(data ?? []) as never[]} />
      </div>
    </>
  );
}
