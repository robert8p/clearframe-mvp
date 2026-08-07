import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { CogniMark } from "@/components/CogniMark";

export default function Page() {
  return (
    <main className="auth-wrap">
      <div className="auth-shell">
        <section className="auth-panel">
          <CogniMark href="/" />
          <div className="kicker" style={{ marginTop: 28 }}>Welcome back</div>
          <h1>Train your mind for the AI age.</h1>
          <p className="lead" style={{ fontSize: 18 }}>
            Continue building stronger judgement, better evidence evaluation and sharper AI verification.
          </p>
          <div className="grid grid-2" style={{ marginTop: 26 }}>
            <div className="stat-card">
              <div className="kicker">Daily habit</div>
              <div className="stat">5–10 min</div>
              <p className="muted">Designed for senior professionals, not generic e-learning.</p>
            </div>
            <div className="stat-card">
              <div className="kicker">Outcome</div>
              <div className="stat">Better judgement</div>
              <p className="muted">Challenge weak assumptions before they become costly decisions.</p>
            </div>
          </div>
        </section>

        <section className="auth-panel auth-card">
          <div className="kicker">Sign in</div>
          <h2 style={{ fontSize: 34, marginTop: 10 }}>Welcome back</h2>
          <p className="muted">Continue your Cogni training.</p>
          <AuthForm mode="login" />
          <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
            New here? <Link href="/signup"><strong>Create an account</strong></Link>
          </p>
        </section>
      </div>
    </main>
  );
}
