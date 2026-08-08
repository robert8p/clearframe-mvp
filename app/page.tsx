import Link from "next/link";
import { CogniMark } from "@/components/CogniMark";

export default function LandingPage() {
  return (
    <main className="hero-shell">
      <div className="hero-wrap">
        <section className="hero-copy">
          <CogniMark />
          <div className="cg-kicker" style={{ marginTop: 30 }}>Train your mind for the AI age</div>
          <h1>Sharper judgement. Better decisions. Stronger thinking.</h1>
          <p className="lead">
            Cogni turns critical thinking, evidence evaluation and AI-output verification into a daily habit with premium app-quality UX.
          </p>

          <div style={{ display: "flex", gap: 12, marginTop: 26, flexWrap: "wrap" }}>
            <Link href="/signup" className="cg-button">Get started</Link>
            <Link href="/login" className="cg-button secondary">Sign in</Link>
          </div>

          <div className="hero-points">
            <div className="hero-point">
              <div className="hero-icon" />
              <div>
                <strong>Adaptive daily training</strong>
                <p>Five-question sessions that balance weak-skill reinforcement, AI verification and variety.</p>
              </div>
            </div>
            <div className="hero-point">
              <div className="hero-icon" />
              <div>
                <strong>Beautiful progress tracking</strong>
                <p>See your judgement profile improve without fake psychometric claims or childish gamification.</p>
              </div>
            </div>
            <div className="hero-point">
              <div className="hero-icon" />
              <div>
                <strong>Built for serious professionals</strong>
                <p>Designed for people making real decisions in business, not generic quiz-app users.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="hero-visual">
          <div className="phone-card" style={{ margin: "0 auto" }}>
            <div className="phone-screen">
              <div className="phone-status">
                <span>9:41</span>
                <span>◦◦◦</span>
              </div>
              <div className="phone-hero-orb" />
              <div style={{ textAlign: "center", marginTop: 84 }}>
                <div style={{ fontSize: 22, color: "white" }}>Welcome to</div>
                <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.05em", background: "linear-gradient(90deg, #14d8ff, #6a6fff, #a945ff)", WebkitBackgroundClip: "text", color: "transparent" }}>Cogni</div>
                <p style={{ maxWidth: 260, margin: "12px auto 0" }}>
                  Your AI-powered learning companion for sharper judgement.
                </p>
              </div>
              <div style={{ marginTop: 26 }}>
                <button className="cg-button" style={{ width: "100%" }}>Start your journey</button>
                <p style={{ textAlign: "center", fontSize: 13, marginTop: 14 }}>Already have an account? <strong>Sign in</strong></p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
