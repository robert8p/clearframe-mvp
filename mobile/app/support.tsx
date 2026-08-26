import React, { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { apiFetch } from "@/lib/api";
import { Body, Card, Eyebrow, PrimaryButton, Screen, Title } from "@/components/ui";
import { colors } from "@/lib/theme";

type Category = "account" | "subscription" | "billing" | "learning" | "bug" | "privacy" | "other";
const CATEGORIES: { value: Category; label: string }[] = [
  { value: "subscription", label: "Cogni Pro / restore" },
  { value: "billing", label: "Billing or store purchase" },
  { value: "account", label: "Account or sign-in" },
  { value: "learning", label: "Learning or progress" },
  { value: "bug", label: "Something isn't working" },
  { value: "privacy", label: "Privacy or deletion" },
  { value: "other", label: "Something else" },
];

export default function SupportScreen() {
  const [category, setCategory] = useState<Category>("subscription");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  async function submit() {
    if (busy) return;
    const trimmed = message.trim();
    if (trimmed.length < 10) { setError("Please add a little more detail so Cogni support can help."); return; }
    setBusy(true); setError("");
    try {
      const result = await apiFetch<{ ok: boolean; requestId: string }>("/api/mobile/support", {
        method: "POST",
        body: JSON.stringify({ category, message: trimmed, appVersion: "0.4.0", platform: Platform.OS }),
      });
      setSubmittedId(result.requestId);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Cogni couldn't send your support request.");
    } finally { setBusy(false); }
  }

  if (submittedId) return <Screen><Card style={{ borderColor: "rgba(0,229,255,.34)" }}><Eyebrow>Request received</Eyebrow><Title size={27}>Cogni support has your message.</Title><Body muted>Your reference is {submittedId}. Your request is stored privately with your Cogni account details so it can be investigated.</Body><PrimaryButton label="Back to Profile" onPress={() => router.replace("/(tabs)/profile")} /><PrimaryButton secondary label="Send another request" onPress={() => setSubmittedId(null)} /></Card></Screen>;

  return <Screen>
    <View style={{ gap: 6 }}><Eyebrow>Private support</Eyebrow><Title>How can we help?</Title><Body muted>Your message goes to Cogni&apos;s private support queue. Do not include card numbers, passwords or other payment credentials.</Body></View>
    <Card>
      <Eyebrow>Topic</Eyebrow>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>{CATEGORIES.map((item) => { const selected = item.value === category; return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setCategory(item.value)} style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: selected ? colors.cyan : colors.line, backgroundColor: selected ? "rgba(0,229,255,.08)" : "rgba(13,20,47,.75)", paddingHorizontal: 14, justifyContent: "center", opacity: pressed ? .78 : 1 })}><Text style={{ color: colors.text, fontSize: 15, fontWeight: selected ? "900" : "700" }}>{item.label}</Text></Pressable>; })}</View>
      <Eyebrow>Message</Eyebrow>
      <TextInput multiline textAlignVertical="top" value={message} onChangeText={setMessage} maxLength={4000} placeholder="Describe what happened, what you expected, and anything you already tried." placeholderTextColor={colors.soft} accessibilityLabel="Support message" style={{ minHeight: 160, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg2, color: colors.text, fontSize: 16, lineHeight: 23, padding: 14 }} />
      <Text style={{ color: colors.soft, fontSize: 12.5, textAlign: "right" }}>{message.length}/4000</Text>
      {error ? <Text accessibilityLiveRegion="assertive" style={{ color: colors.danger, lineHeight: 21 }}>{error}</Text> : null}
      <PrimaryButton label={busy ? "Sending…" : "Send support request"} disabled={busy} onPress={() => void submit()} />
    </Card>
    <Card><Eyebrow>Subscription reminder</Eyebrow><Body muted>Deleting your Cogni account or uninstalling Cogni does not cancel an Apple App Store or Google Play subscription. Use your store subscription settings to stop future renewal.</Body></Card>
  </Screen>;
}
