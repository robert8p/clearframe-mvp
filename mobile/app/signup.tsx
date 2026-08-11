import React, { useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { Body, Card, PrimaryButton, Screen, Title } from "@/components/ui";
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
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() || undefined },
          emailRedirectTo: `${WEB_URL}/login`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        router.replace("/onboarding");
      } else {
        setMessage("Account created. Confirm the email from Cogni, then return to this app and sign in.");
      }
    } catch {
      setError("Connection interrupted. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
      <Card>
        <Title size={32}>Create your Cogni account</Title>
        <Body muted>Your skill scores, streak and progress will sync across mobile and web.</Body>
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.soft}
            style={{ minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, color: colors.text, paddingHorizontal: 14, fontSize: 16 }}
          />
          <Text style={{ color: colors.text, fontWeight: "700", marginTop: 6 }}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.soft}
            style={{ minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, color: colors.text, paddingHorizontal: 14, fontSize: 16 }}
          />
          <Text style={{ color: colors.text, fontWeight: "700", marginTop: 6 }}>Password</Text>
          <TextInput
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.soft}
            style={{ minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel2, color: colors.text, paddingHorizontal: 14, fontSize: 16 }}
          />
        </View>
        {error ? <Text selectable style={{ color: "#ff9ac0", lineHeight: 21 }}>{error}</Text> : null}
        {message ? <Text selectable style={{ color: colors.green, lineHeight: 21 }}>{message}</Text> : null}
        <PrimaryButton label={busy ? "Creating account…" : "Create account"} disabled={busy || !email || password.length < 8} onPress={() => void submit()} />
      </Card>
    </Screen>
  );
}
