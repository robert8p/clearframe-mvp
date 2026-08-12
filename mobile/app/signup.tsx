import React, { useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { Body, Card, fieldStyle, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? process.env.EXPO_PUBLIC_API_URL ?? "https://gocogni.vercel.app").replace(/\/$/, "");

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() || undefined }, emailRedirectTo: `${WEB_URL}/login` } });
      if (authError) { setError(authError.message); return; }
      if (data.session) router.replace("/onboarding"); else setMessage("Account created. Confirm the email from Cogni, then return to this app and sign in.");
    } catch { setError("Connection interrupted. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}><View style={{ alignItems: "center" }}><CogniLogo centered /></View><Card><Title size={30}>Create your Cogni account</Title><Body muted>Your skill profile, streak and progress will stay synced across devices.</Body><View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: "800" }}>Name</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800", marginTop: 6 }}>Email</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800", marginTop: 6 }}>Password</Text><TextInput secureTextEntry autoCapitalize="none" autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.soft} style={fieldStyle} /></View>{error ? <Text selectable style={{ color: "#ff9ac0", lineHeight: 21 }}>{error}</Text> : null}{message ? <Text selectable style={{ color: colors.green, lineHeight: 21 }}>{message}</Text> : null}<PrimaryButton label={busy ? "Creating account…" : "Create account"} disabled={busy || !email || password.length < 8} onPress={() => void submit()} /></Card></Screen>;
}
