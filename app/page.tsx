import Link from "next/link";
import { CogniMark } from "@/components/CogniMark";

export default function LandingPage() {
  return (
    <main className="cg-public-shell">
      <div className="cg-public-grid">
        <section className="cg-public-copy">
          <CogniMark />
          <div className="cg-kicker" style={{ marginTop: 30 }}>AI-powered learning for a sharper mind</div>
          <h1>Learn smarter. Think deeper. Decide better.</h1>
          <p className="cg-public-lead">
            Cogni turns critical thinking, evidence evaluation and AI-output verification into a daily habit built for the AI age.
          </p>
          <div className="cg-public-actions">
            <Link className="cg-button" href="/signup">Start your journey</Link>
            <Link className="cg-button secondary" href="/login">Sign in</Link>
          </div>
          <div className="cg-public-features">
            <div><span className="cg-feature-dot cyan"/><div><strong>Smart learning</strong><p>Adaptive sessions based on measured strengths, gaps and confidence.</p></div></div>
            <div><span className="cg-feature-dot purple"/><div><strong>AI study buddy</strong><p>Grounded coaching that helps you challenge assumptions and sharpen reasoning.</p></div></div>
            <div><span className="cg-feature-dot green"/><div><strong>Track progress</strong><p>See evidence build across judgement skills without fake psychometric claims.</p></div></div>
          </div>
        </section>

        <section className="cg-public-phone">
          <div className="cg-phone-status"><span>9:41</span><span>●●●</span></div>
          <div className="cg-brain-orb"><span>◌</span></div>
          <div className="cg-phone-welcome">
            <span>Welcome to</span>
            <strong>Cogni</strong>
            <p>Your AI-powered learning companion for sharper judgement.</p>
          </div>
          <Link className="cg-button cg-full" href="/signup">Get started</Link>
          <p className="cg-phone-signin">Already have an account? <Link href="/login">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}
