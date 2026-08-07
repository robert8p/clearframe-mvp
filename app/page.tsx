import Link from "next/link";
import { CogniMark } from "@/components/CogniMark";

export default function LandingPage() {
  return (
    <main className="hero">
      <div className="hero-inner">
        <div className="hero-grid">
          <section className="hero-copy">
            <CogniMark href="/" />
            <div className="kicker" style={{ marginTop: 26 }}>
              Train your mind for the AI age
            </div>
            <h1>Build sharper judgement every day.</h1>
            <p className="lead">
              Cogni helps professionals challenge AI output, evaluate evidence,
              spot flawed reasoning and make stronger decisions under uncertainty
              in just five to ten minutes a day.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              <Link className="button" href="/signup">
                Start your diagnostic
              </Link>
              <Link className="button secondary" href="/login">
                Sign in
              </Link>
            </div>
            <div className="metric-row">
              <div className="metric">
                <div className="kicker">Daily habit</div>
                <strong>5–10 minutes</strong>
                <p className="muted">Fast enough to sustain, deep enough to matter.</p>
              </div>
              <div className="metric">
                <div className="kicker">Measures</div>
                <strong>15 judgement skills</strong>
                <p className="muted">From source-quality evaluation to AI verification.</p>
              </div>
              <div className="metric">
                <div className="kicker">Built for trust</div>
                <strong>No fake percentiles</strong>
                <p className="muted">Development scores first. Scientific benchmarking later.</p>
              </div>
            </div>
          </section>

          <section className="hero-visual">
            <div className="visual-badge">
              <span className="pill">AI-powered learning</span>
            </div>
            <div className="orb-ring" />
            <div className="orb-core" />
            <div className="orb-pillar" />
            <div className="floating-card">
              <div className="kicker">Today’s focus</div>
              <h3 style={{ marginTop: 8 }}>Strategic decision-making</h3>
              <p className="muted">Challenge AI recommendations before they harden into bad decisions.</p>
              <div className="row">
                <span className="pill">+150 XP</span>
                <span className="pill">15 min</span>
              </div>
              <div className="divider" />
              <div className="row">
                <div>
                  <div className="muted">Progress</div>
                  <strong>72%</strong>
                </div>
                <div>
                  <div className="muted">Streak</div>
                  <strong>12 days</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
