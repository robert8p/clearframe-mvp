import React, { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { FormField } from "@/components/form-field";
import { Body, Card, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function RecoveryScreen() {
  const { source } = useLocalSearchParams<{ source?: string }>();
  const fromProfile = source === "profile";
  const { session, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (loading) return <LoadingState label={fromProfile ? "Opening password settings…" : "Opening your recovery session…"} />;
  if (done) return <Redirect href={fromProfile ? "/(tabs)/profile" : "/(tabs)/home"} />;

  if (!session) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Card>
          <Title size={28}>Recovery link unavailable</Title>
          <Body muted>This link may have expired. Request a fresh password reset email and try again.</Body>
          <PrimaryButton label="Request another link" onPress={() => router.replace("/forgot-password")} />
          <PrimaryButton label="Back to welcome" secondary onPress={() => router.replace("/")} />
        </Card>
      </Screen>
    );
  }

  async function updatePassword() {
    if (busy) return;
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}>
      <View style={{ alignItems: "center" }}>
        <CogniLogo centered animated={false} />
      </View>
      <Card>
        <Title size={30}>{fromProfile ? "Change your password" : "Choose a new password"}</Title>
        <Body muted>
          {fromProfile
            ? "Use at least 8 characters. Your new password will apply the next time you sign in to Cogni."
            : "Use at least 8 characters. Once saved, you’ll continue in Cogni on this device."}
        </Body>
        <View style={{ gap: 14 }}>
          <FormField
            label="New password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError("");
            }}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.soft}
          />
          <FormField
            label="Confirm password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            returnKeyType="done"
            value={confirm}
            onChangeText={(value) => {
              setConfirm(value);
              if (error) setError("");
            }}
            onSubmitEditing={() => void updatePassword()}
            placeholder="Repeat password"
            placeholderTextColor={colors.soft}
          />
        </View>
        {confirm && password !== confirm ? (
          <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, lineHeight: 22 }}>
            Passwords do not match.
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton label={busy ? "Saving…" : "Save new password"} disabled={busy} onPress={() => void updatePassword()} />
        {fromProfile ? (
          <PrimaryButton label="Back to profile" secondary onPress={() => router.replace("/(tabs)/profile")} />
        ) : null}
      </Card>
    </Screen>
  );
}
