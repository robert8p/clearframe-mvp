import React, { useRef, useState } from "react";
import { Redirect, router } from "expo-router";
import * as Linking from "expo-linking";
import { Text, TextInput, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { FormField } from "@/components/form-field";
import { Body, Card, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const { session, loading } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (loading) return <LoadingState label="Opening password recovery…" />;

  // A signed-in learner should never be trapped on a signed-out recovery route.
  // This also repairs a stale/reset deep-link route restored by Android.
  if (session) return <Redirect href="/(tabs)/home" />;

  async function submit() {
    if (busy) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address first.");
      emailRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: Linking.createURL("auth/recovery"),
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send the password reset email.");
    } finally {
      setBusy(false);
    }
  }

  function returnToSignIn() {
    router.replace("/login");
  }

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}>
      <View style={{ alignItems: "center" }}>
        <CogniLogo centered animated={false} />
      </View>
      <Card>
        <Title size={30}>Reset your password</Title>
        <Body muted>Enter your Cogni email. The recovery link will reopen this app so you can choose a new password.</Body>
        {!sent ? (
          <>
            <FormField
              ref={emailRef}
              label="Email"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error === "Enter your email address first.") setError("");
              }}
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              placeholder="you@example.com"
              placeholderTextColor={colors.soft}
            />
            {/* Regression note: never restore the inert state/copy "Enter your email to enable the recovery button." */}
            <PrimaryButton
              label={busy ? "Sending…" : "Send recovery email"}
              disabled={busy}
              onPress={() => void submit()}
            />
          </>
        ) : (
          <Text accessibilityLiveRegion="polite" selectable style={{ color: colors.green, lineHeight: 22, fontWeight: "800" }}>
            Recovery email sent. Open the link in that email on this device.
          </Text>
        )}
        {error ? (
          <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton label="Back to sign in" secondary onPress={returnToSignIn} />
      </Card>
    </Screen>
  );
}
