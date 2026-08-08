import Link from "next/link";
import { CogniMark } from "@/components/CogniMark";

export default function LandingPage() {
  return (
    <main className="cg-public-shell">
      <div className="cg-public-grid">
        <section className="cg-public-copy">
          <CogniMark />
          <div className="cg-kicker" style={{ marginTop: 30 }}>Daily practice for sharper thinking</div>
          <h1>Learn smarter. Think deeper. Decide better.</h1>
          <p className="cg-public-lead">
            Cogni gives you short daily practice in critical thinking, checking evidence and checking AI answers.
          </p>
          <div className="cg-public-actions">
            <Link className="cg-button" href="/signup">Start learning</Link>
            <Link className="cg-button secondary" href="/login">Sign in</Link>
          </div>
          <div className="cg-public-features">
            <div><span className="cg-feature-dot cyan"/><div><strong>Smart learning</strong><p>Sessions adapt to the skills you most need to practise.</p></div></div>
            <div><span className="cg-feature-dot purple"/><div><strong>AI coach</strong><p>Get clear coaching that helps you question assumptions and explain your thinking.</p></div></div>
            <div><span className="cg-feature-dot green"/><div><strong>Track progress</strong><p>See how your skills change as Cogni learns from more of your answers.</p></div></div>
          </div>
        </section>

        <section className="cg-public-phone">
          <div className="cg-phone-status"><span>9:41</span><span>●●●</span></div>
          <div className="cg-brain-orb"><span>◌</span></div>
          <div className="cg-phone-welcome">
            <span>Welcome to</span>
            <strong>Cogni</strong>
            <p>Your daily learning companion for clearer thinking and better decisions.</p>
          </div>
          <Link className="cg-button cg-full" href="/signup">Get started</Link>
          <p className="cg-phone-signin">Already have an account? <Link href="/login">Sign in</Link></p>
        </section>
      </div>
    </main>
  );
}
