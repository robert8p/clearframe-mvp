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
          <h1>Welcome back.</h1>
          <p>Continue your Cogni training and keep sharpening the skills that matter.</p>
          <div className="cg-auth-benefits">
            <span>Critical thinking</span><span>AI verification</span><span>Decision quality</span>
          </div>
        </section>
        <section className="cg-card cg-auth-card">
          <div className="cg-kicker">Sign in</div>
          <h2>Continue learning</h2>
          <p>Enter your details to continue.</p>
          <AuthForm mode="login" />
          <p className="cg-auth-switch">New here? <Link href="/signup"><strong>Create an account</strong></Link></p>
        </section>
      </div>
    </main>
  );
}
