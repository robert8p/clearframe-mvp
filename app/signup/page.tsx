import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function Page() {
  return <main className="auth-wrap"><section className="card auth-card">
    <div className="brand">Clearframe<small>Human judgement training</small></div>
    <h1 style={{fontSize:34, marginTop:28}}>Build your judgement profile</h1>
    <p className="muted">Start with a 10–15 minute diagnostic.</p>
    <AuthForm mode="signup" />
    <p className="muted" style={{fontSize:13, marginTop:18}}>
      Already have an account? <Link href="/login"><strong>Sign in</strong></Link>
    </p>
  </section></main>;
}
