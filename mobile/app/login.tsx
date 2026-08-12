import React, { useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { Body, Card, fieldStyle, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit() { setBusy(true); setError(""); const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setBusy(false); if (authError) { setError(authError.message); return; } router.replace("/(tabs)/home"); }
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}><View style={{ alignItems: "center" }}><CogniLogo centered /></View><Card><Title size={31}>Welcome back</Title><Body muted>Pick up exactly where you left off across Cogni.</Body><View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: "800" }}>Email</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800", marginTop: 6 }}>Password</Text><TextInput secureTextEntry autoCapitalize="none" autoComplete="current-password" value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor={colors.soft} style={fieldStyle} /></View>{error ? <Text selectable style={{ color: "#ff9ac0", lineHeight: 21 }}>{error}</Text> : null}<PrimaryButton label={busy ? "Signing in…" : "Sign in"} disabled={busy || !email || !password} onPress={() => void submit()} /></Card></Screen>;
}
