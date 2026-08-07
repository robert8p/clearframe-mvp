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

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name } },
      });
      if (error) setError(error.message);
      else if (!data.session) setMessage("Account created. Check your email to confirm, then sign in.");
      else { router.push("/onboarding"); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else { router.push("/dashboard"); router.refresh(); }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit}>
      {mode === "signup" && <><label>Name</label><input className="input" value={name} onChange={e=>setName(e.target.value)} required /></>}
      <label>Email</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
      <label>Password</label><input className="input" type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required />
      {error && <p style={{color:"var(--danger)"}}>{error}</p>}
      {message && <p style={{color:"var(--success)"}}>{message}</p>}
      <button className="button" style={{width:"100%", marginTop:18}} disabled={busy}>{busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
  );
}
