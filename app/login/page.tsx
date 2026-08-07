import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export default function Page() {
  return <main className="auth-wrap"><section className="card auth-card">
    <div className="brand">Clearframe<small>Human judgement training</small></div>
    <h1 style={{fontSize:34, marginTop:28}}>Welcome back</h1>
    <p className="muted">Continue your judgement training.</p>
    <AuthForm mode="login" />
    <p className="muted" style={{fontSize:13, marginTop:18}}>
      New here? <Link href="/signup"><strong>Create an account</strong></Link>
    </p>
  </section></main>;
}
