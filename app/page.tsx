import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="hero">
      <div className="hero-inner">
        <div className="kicker">Clearframe · working codename</div>
        <div className="hero-copy">
          <h1>Train the judgement AI cannot replace.</h1>
          <p className="lead">
            Five minutes a day to become better at challenging AI output, evaluating evidence,
            spotting flawed reasoning and making decisions under uncertainty.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 26, flexWrap: "wrap" }}>
            <Link className="button" href="/signup">Start your diagnostic</Link>
            <Link className="button secondary" href="/login">Sign in</Link>
          </div>
        </div>
        <div className="metric-row">
          <div className="metric"><div className="kicker">Daily</div><strong>5–10 minutes</strong></div>
          <div className="metric"><div className="kicker">Measures</div><strong>15 judgement skills</strong></div>
          <div className="metric"><div className="kicker">Method</div><strong>Adaptive + explainable</strong></div>
          <div className="metric"><div className="kicker">Promise</div><strong>No fake percentiles</strong></div>
        </div>
      </div>
    </main>
  );
}
