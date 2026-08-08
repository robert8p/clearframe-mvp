import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { CogniMark } from "@/components/CogniMark";

export default function LoginPage() {
  return (
    <main className="auth-wrap">
      <div className="auth-shell">
        <section className="auth-panel">
          <CogniMark />
          <div className="cg-kicker" style={{ marginTop: 28 }}>Welcome back</div>
          <h1>Continue your learning journey.</h1>
          <p style={{ fontSize: 18, color: "#c8d2eb" }}>
            Train judgement, challenge AI output and build better decision quality.
          </p>
          <div className="metric-list" style={{ marginTop: 28 }}>
            <div className="metric-box">
              <div className="cg-kicker">Daily focus</div>
              <h2>Five high-value questions</h2>
              <p>Fast enough to sustain. Strong enough to sharpen how you think.</p>
            </div>
            <div className="metric-box">
              <div className="cg-kicker">Built for professionals</div>
              <h2>Modern, serious, evidence-led</h2>
              <p>No gimmicks. Just better human judgement for an AI-shaped world.</p>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="cg-kicker">Sign in</div>
          <h2 style={{ fontSize: 34, marginTop: 10 }}>Welcome back</h2>
          <p className="muted">Enter your details to continue with Cogni.</p>
          <AuthForm mode="login" />
          <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
            New here? <Link href="/signup"><strong>Create an account</strong></Link>
          </p>
        </section>
      </div>
    </main>
  );
}
