import { requireUser } from "@/lib/auth";

export default async function ProgressPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("user_responses").select("is_correct,confidence,response_time_ms").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);

  const rows = data ?? [];
  const accuracy = rows.length ? Math.round((rows.filter((row) => row.is_correct).length / rows.length) * 100) : 0;
  const avgConfidence = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.confidence ?? 0), 0) / rows.length) : 0;
  const avgSpeed = rows.length ? Math.round(rows.reduce((sum, row) => sum + (row.response_time_ms ?? 0), 0) / rows.length / 1000) : 0;

  return (
    <>
      <div className="cg-kicker">Progress</div>
      <h1>Track what matters.</h1>
      <p>Cogni keeps the feedback loop tight: correctness, confidence and consistency.</p>

      <div className="cg-grid three" style={{ marginTop: 18 }}>
        <section className="cg-card"><div className="cg-kicker">Accuracy</div><div className="cg-stat">{accuracy}%</div><p>Recent answer quality across your latest responses.</p></section>
        <section className="cg-card"><div className="cg-kicker">Average confidence</div><div className="cg-stat">{avgConfidence}%</div><p>Useful for calibration, not ego.</p></section>
        <section className="cg-card"><div className="cg-kicker">Average speed</div><div className="cg-stat">{avgSpeed}s</div><p>Speed adds context, not status.</p></section>
      </div>

      <section className="cg-card" style={{ marginTop: 18 }}>
        <div className="cg-kicker">What to look for</div>
        <h2>Confidence should earn its place.</h2>
        <p>If your confidence is consistently high while accuracy lags, that is a trainable signal. Cogni treats calibration as part of judgement quality.</p>
      </section>
    </>
  );
}
