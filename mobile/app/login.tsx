import React, { useRef, useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { FormField } from "@/components/form-field";
import { Body, Card, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit() { if (busy || !email || !password) return; setBusy(true); setError(""); const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setBusy(false); if (authError) { setError(authError.message); return; } router.replace("/(tabs)/home"); }
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}><View style={{ alignItems: "center" }}><CogniLogo centered /></View><Card><Title size={31}>Welcome back</Title><Body muted>Pick up exactly where you left off across Cogni.</Body><View style={{ gap: 14 }}><FormField label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" returnKeyType="next" value={email} onChangeText={setEmail} onSubmitEditing={() => passwordRef.current?.focus()} placeholder="you@example.com" placeholderTextColor={colors.soft} /><FormField ref={passwordRef} label="Password" secureTextEntry autoCapitalize="none" autoComplete="current-password" returnKeyType="done" value={password} onChangeText={setPassword} onSubmitEditing={() => void submit()} placeholder="Your password" placeholderTextColor={colors.soft} /></View>{error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}<PrimaryButton label={busy ? "Signing in…" : "Sign in"} disabled={busy || !email || !password} onPress={() => void submit()} /></Card></Screen>;
}
