import React, { useRef, useState } from "react";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Text, TextInput, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { FormField } from "@/components/form-field";
import { Body, Card, PrimaryButton, Screen, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function SignupScreen() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    if (busy) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      emailRef.current?.focus();
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      passwordRef.current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { full_name: name.trim() || undefined },
          emailRedirectTo: Linking.createURL("auth/confirm"),
        },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data.session) router.replace("/onboarding");
      else setMessage("Account created. Confirm the email from Cogni; the confirmation link will reopen this app.");
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
        <Title size={30}>Create your Cogni account</Title>
        <Body muted>Your skill profile, streak and progress will stay synced across devices.</Body>
        <View style={{ gap: 14 }}>
          <FormField
            label="Name"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            placeholder="Your name"
            placeholderTextColor={colors.soft}
          />
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
            hint="Use at least 8 characters."
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            returnKeyType="done"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError("");
            }}
            onSubmitEditing={() => void submit()}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.soft}
          />
        </View>
        {error ? (
          <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>
            {error}
          </Text>
        ) : null}
        {message ? (
          <Text accessibilityLiveRegion="polite" selectable style={{ color: colors.green, lineHeight: 22 }}>
            {message}
          </Text>
        ) : null}
        <PrimaryButton label={busy ? "Creating account…" : "Create account"} disabled={busy} onPress={() => void submit()} />
        <PrimaryButton label="Back to sign in" secondary onPress={() => router.replace("/login")} />
      </Card>
    </Screen>
  );
}
