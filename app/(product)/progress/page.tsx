import { requireUser } from "@/lib/auth";

export default async function Progress() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("user_responses")
    .select("is_correct,created_at,response_time_ms,confidence")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = data ?? [];
  const accuracy = rows.length ? Math.round((rows.filter((row) => row.is_correct).length / rows.length) * 100) : 0;
  const avgConfidence = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.confidence ?? 0), 0) / rows.length) : 0;
  const avgResponseTime = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.response_time_ms ?? 0), 0) / rows.length / 1000) : 0;

  return (
    <>
      <div className="kicker">Progress</div>
      <h1>Evidence, not vibes.</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        Progress matters when you can see it. Cogni tracks correctness, confidence and consistency so you can train with better feedback loops.
      </p>

      <div className="grid grid-3" style={{ marginTop: 18 }}>
        <section className="card"><div className="kicker">Recent accuracy</div><div className="stat">{accuracy}%</div><p className="muted">Last {rows.length} responses analysed.</p></section>
        <section className="card"><div className="kicker">Average confidence</div><div className="stat">{avgConfidence}%</div><p className="muted">Useful for calibration, not ego.</p></section>
        <section className="card"><div className="kicker">Average response time</div><div className="stat">{avgResponseTime}s</div><p className="muted">Speed is diagnostic context, not intelligence.</p></section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Calibration signal</h2>
        <p>
          A widening gap between confidence and correctness is a useful learning signal. Cogni treats that as a trainable pattern, not a personality judgement.
        </p>
      </section>
    </>
  );
}
