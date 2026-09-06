import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { CogniMark } from "@/components/CogniMark";

export default function Page() {
  return (
    <main className="cg-auth-wrap">
      <div className="cg-auth-layout">
        <section className="cg-auth-visual">
          <CogniMark />
          <div className="cg-brain-orb small"><span>◌</span></div>
          <h1>Start training your thinking.</h1>
          <p>Start with a short starting check, then follow practice tailored to you.</p>
          <div className="cg-auth-benefits">
            <span>Critical thinking</span><span>AI verification</span><span>Decision quality</span>
          </div>
        </section>
        <section className="cg-card cg-auth-card">
          <div className="cg-kicker">Create account</div>
          <h2>Start your journey</h2>
          <p>Create your Cogni account to begin.</p>
          <AuthForm mode="signup" />
          <p className="cg-auth-switch">Already have an account? <Link href="/login"><strong>Sign in</strong></Link></p>
        </section>
      </div>
    </main>
  );
}
