import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { CogniMark } from "@/components/CogniMark";

export default function Page() {
  return (
    <main className="auth-wrap">
      <div className="auth-shell">
        <section className="auth-panel">
          <CogniMark href="/" />
          <div className="kicker" style={{ marginTop: 28 }}>Start strong</div>
          <h1>Build your judgement profile.</h1>
          <p className="lead" style={{ fontSize: 18 }}>
            Begin with a short diagnostic, then get a personalised training pathway built around how you actually reason.
          </p>
          <div className="card" style={{ marginTop: 28 }}>
            <div className="kicker">What you’ll get</div>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "var(--muted-2)", lineHeight: 1.8 }}>
              <li>Development scores across 15 judgement skills</li>
              <li>A daily five-question training session</li>
              <li>AI-age reasoning explanations and coaching insights</li>
            </ul>
          </div>
        </section>

        <section className="auth-panel auth-card">
          <div className="kicker">Create account</div>
          <h2 style={{ fontSize: 34, marginTop: 10 }}>Start your diagnostic</h2>
          <p className="muted">Create your Cogni account to begin.</p>
          <AuthForm mode="signup" />
          <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>
            Already have an account? <Link href="/login"><strong>Sign in</strong></Link>
          </p>
        </section>
      </div>
    </main>
  );
}
