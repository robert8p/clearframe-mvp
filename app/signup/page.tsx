import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { CogniMark } from "@/components/CogniMark";

export default function SignupPage() {
  return (
    <main className="auth-wrap">
      <div className="auth-shell">
        <section className="auth-panel">
          <CogniMark />
          <div className="cg-kicker" style={{ marginTop: 28 }}>Start strong</div>
          <h1>Build your judgement profile.</h1>
          <p style={{ fontSize: 18, color: "#c8d2eb" }}>
            Start with a short diagnostic, then get daily training built around how you actually reason.
          </p>
          <div className="metric-list" style={{ marginTop: 28 }}>
            <div className="metric-box"><strong>Critical thinking</strong><p>Evaluate evidence, assumptions and arguments more effectively.</p></div>
            <div className="metric-box"><strong>AI verification</strong><p>Challenge AI confidently instead of accepting plausible output too quickly.</p></div>
            <div className="metric-box"><strong>Decision quality</strong><p>Train the human edge that matters when stakes are real.</p></div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="cg-kicker">Create account</div>
          <h2 style={{ fontSize: 34, marginTop: 10 }}>Join Cogni</h2>
          <p className="muted">Create your account to begin the diagnostic.</p>
          <AuthForm mode="signup" />
          <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
            Already have an account? <Link href="/login"><strong>Sign in</strong></Link>
          </p>
        </section>
      </div>
    </main>
  );
}
