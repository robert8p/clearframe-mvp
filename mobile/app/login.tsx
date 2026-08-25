import React, { useRef, useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { FormField } from "@/components/form-field";
import { ActionLink, Body, Card, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (busy) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      emailRef.current?.focus();
      return;
    }
    if (!password) {
      setError("Enter your password.");
      passwordRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      router.replace("/(tabs)/home");
    } catch {
      setError("Connection interrupted. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}>
      <View style={{ alignItems: "center" }}>
        <CogniLogo centered />
      </View>
      <Card>
        <Title size={31}>Welcome back</Title>
        <Body muted>Pick up exactly where you left off across Cogni.</Body>
        <View style={{ gap: 14 }}>
          <FormField
            ref={emailRef}
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError("");
            }}
            onSubmitEditing={() => passwordRef.current?.focus()}
            placeholder="you@example.com"
            placeholderTextColor={colors.soft}
          />
          <FormField
            ref={passwordRef}
            label="Password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            returnKeyType="done"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError("");
            }}
            onSubmitEditing={() => void submit()}
            placeholder="Your password"
            placeholderTextColor={colors.soft}
          />
        </View>
        {error ? (
          <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton label={busy ? "Signing in…" : "Sign in"} disabled={busy} onPress={() => void submit()} />
        <View style={{ alignItems: "center" }}>
          <ActionLink label="Forgot password?" hint="Send a secure password recovery email" onPress={() => router.push("/forgot-password")} />
        </View>
        <PrimaryButton label="Back to welcome" secondary onPress={() => router.replace("/")} />
      </Card>
    </Screen>
  );
}
