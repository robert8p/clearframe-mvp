import React, { useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { Body, Card, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit() { setBusy(true); setError(""); const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setBusy(false); if (authError) { setError(authError.message); return; } router.replace("/(tabs)/home"); }
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}><Card><Title size={32}>Welcome back</Title><Body muted>Sign in with the same Cogni account you use on the web.</Body><View style={{ gap: 8 }}><Text style={{ color: colors.text, fontWeight: "700" }}>Email</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.soft} style={{ minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, color: colors.text, paddingHorizontal: 14, fontSize: 16 }} /><Text style={{ color: colors.text, fontWeight: "700", marginTop: 6 }}>Password</Text><TextInput secureTextEntry autoCapitalize="none" autoComplete="current-password" value={password} onChangeText={setPassword} placeholder="Your password" placeholderTextColor={colors.soft} style={{ minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, color: colors.text, paddingHorizontal: 14, fontSize: 16 }} /></View>{error ? <Text selectable style={{ color: "#ff9ac0", lineHeight: 21 }}>{error}</Text> : null}<PrimaryButton label={busy ? "Signing in…" : "Sign in"} disabled={busy || !email || !password} onPress={() => void submit()} /></Card></Screen>;
}
