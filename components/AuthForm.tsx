"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function friendlyAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes("rate limit")) return "Email service is temporarily busy. If you already have an account, sign in; otherwise try again shortly.";
  if (value.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (value.includes("user already registered") || value.includes("already been registered")) return "An account already exists for this email. Sign in instead.";
  if (value.includes("email not confirmed")) return "Confirm your email first, then sign in.";
  if (value.includes("password should be")) return "Use a password with at least 8 characters.";
  return message;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: `${appUrl}/login` },
        });
        if (signUpError) setError(friendlyAuthError(signUpError.message));
        else if (!data.session) setMessage("Account created. Check your email to confirm, then sign in.");
        else { router.push("/onboarding"); router.refresh(); }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) setError(friendlyAuthError(signInError.message));
        else { router.push("/dashboard"); router.refresh(); }
      }
    } catch {
      setError("Connection interrupted. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {mode === "signup" && <><label htmlFor="auth-name">Name</label><input id="auth-name" className="input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></>}
      <label htmlFor="auth-email">Email</label>
      <input id="auth-email" className="input" type="email" inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <label htmlFor="auth-password">Password</label>
      <div className="cg-password-wrap">
        <input id="auth-password" className="input" type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required />
        <button type="button" className="cg-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
      </div>
      {error && <p className="cg-auth-message error" role="alert">{error}</p>}
      {message && <p className="cg-auth-message success" aria-live="polite">{message}</p>}
      <button className="cg-button cg-full" style={{ marginTop: 18 }} disabled={busy}>{busy ? (mode === "signup" ? "Creating account…" : "Signing in…") : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form>
  );
}
