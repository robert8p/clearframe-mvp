import React, { useState } from "react";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Text, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { FormField } from "@/components/form-field";
import { ActionLink, Body, Card, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  async function submit() {
    if (!email.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: Linking.createURL("auth/recovery") });
      if (resetError) throw resetError;
      setSent(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send the password reset email."); }
    finally { setBusy(false); }
  }
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}>
    <View style={{ alignItems: "center" }}><CogniLogo centered animated={false} /></View>
    <Card>
      <Title size={30}>Reset your password</Title>
      <Body muted>Enter your Cogni email. The recovery link will reopen this app so you can choose a new password.</Body>
      {!sent ? <><FormField label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} returnKeyType="done" onSubmitEditing={() => void submit()} placeholder="you@example.com" placeholderTextColor={colors.soft} /><PrimaryButton label={busy ? "Sending…" : "Send recovery email"} disabled={busy || !email.trim()} onPress={() => void submit()} /></> : <Text accessibilityLiveRegion="polite" selectable style={{ color: colors.green, lineHeight: 22, fontWeight: "800" }}>Recovery email sent. Open the link in that email on this device.</Text>}
      {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
      <View style={{ alignItems: "center" }}><ActionLink label="Back to sign in" onPress={() => router.replace("/login")} /></View>
    </Card>
  </Screen>;
}
