"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const supabase = createClient();
    if (mode === "signup") {
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${appUrl}/login`,
        },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) setMessage("Account created. Check your email to confirm, then sign in.");
      else { router.push("/onboarding"); router.refresh(); }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else { router.push("/dashboard"); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit}>
      {mode === "signup" && <><label>Name</label><input className="input" value={name} onChange={(event: { target: { value: string } }) => setName(event.target.value)} required /></>}
      <label>Email</label><input className="input" type="email" value={email} onChange={(event: { target: { value: string } }) => setEmail(event.target.value)} required />
      <label>Password</label><input className="input" type="password" minLength={8} value={password} onChange={(event: { target: { value: string } }) => setPassword(event.target.value)} required />
      {error && <p style={{ color: "#ff7fab" }}>{error}</p>}
      {message && <p style={{ color: "#41e27d" }}>{message}</p>}
      <button className="cg-button cg-full" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
  );
}
