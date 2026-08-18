import React, { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { FormField } from "@/components/form-field";
import { Body, Card, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function RecoveryScreen() {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  if (loading) return <LoadingState label="Opening your recovery session…" />;
  if (done) return <Redirect href="/(tabs)/home" />;
  if (!session) return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}><Card><Title size={28}>Recovery link unavailable</Title><Body muted>This link may have expired. Request a fresh password reset email and try again.</Body><PrimaryButton label="Request another link" onPress={() => router.replace("/forgot-password")} /></Card></Screen>;

  async function updatePassword() {
    if (busy || password.length < 8 || password !== confirm) return;
    setBusy(true); setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update your password."); }
    finally { setBusy(false); }
  }

  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}>
    <View style={{ alignItems: "center" }}><CogniLogo centered animated={false} /></View>
    <Card><Title size={30}>Choose a new password</Title><Body muted>Use at least 8 characters. Once saved, you’ll continue in Cogni on this device.</Body><View style={{ gap: 14 }}><FormField label="New password" secureTextEntry autoCapitalize="none" autoComplete="new-password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor={colors.soft} /><FormField label="Confirm password" secureTextEntry autoCapitalize="none" autoComplete="new-password" returnKeyType="done" value={confirm} onChangeText={setConfirm} onSubmitEditing={() => void updatePassword()} placeholder="Repeat password" placeholderTextColor={colors.soft} /></View>{confirm && password !== confirm ? <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, lineHeight: 22 }}>Passwords do not match.</Text> : null}{error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}<PrimaryButton label={busy ? "Saving…" : "Save new password"} disabled={busy || password.length < 8 || password !== confirm} onPress={() => void updatePassword()} /></Card>
  </Screen>;
}
