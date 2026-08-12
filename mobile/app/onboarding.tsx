import React, { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniLogo } from "@/components/brand";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, fieldStyle, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";

const audiences = [
  { slug: "university_student", icon: "🎓", label: "University student", text: "Sharper thinking for study, AI use and the move into work" },
  { slug: "graduate_early_career", icon: "🚀", label: "Graduate / early career", text: "Build the judgement that makes people trust your work" },
  { slug: "junior_professional", icon: "💼", label: "Junior professional", text: "Turn analysis into stronger recommendations and decisions" },
  { slug: "management", icon: "🧭", label: "Management", text: "Make clearer decisions about people, priorities, resources and risk" },
  { slug: "executive", icon: "♟", label: "Executive", text: "Sharpen strategic judgement under uncertainty" },
] as const;

export default function OnboardingScreen() {
  const { session, loading: authLoading } = useAuth(); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [audience, setAudience] = useState(""); const [functionArea, setFunctionArea] = useState(""); const [industry, setIndustry] = useState(""); const [goal, setGoal] = useState("");
  useEffect(() => { if (!session) { setLoading(false); return; } apiFetch<MobileProfileResponse>("/api/mobile/profile").then((data) => { setAudience(data.profile.audience_segment ?? ""); setFunctionArea(data.profile.function_area ?? ""); setIndustry(data.profile.industry ?? ""); setGoal(data.profile.primary_goal ?? ""); }).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load your profile.")).finally(() => setLoading(false)); }, [session]);
  if (authLoading || loading) return <LoadingState />; if (!session) return <Redirect href="/login" />;
  async function save() { if (!audience) return; setBusy(true); setError(""); try { await apiFetch("/api/mobile/profile", { method: "POST", body: JSON.stringify({ audienceSegment: audience, functionArea: functionArea || null, industry: industry || null, primaryGoal: goal || null }) }); router.replace("/(tabs)/train"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save your learning context."); } finally { setBusy(false); } }
  const isStudent = audience === "university_student";
  return <Screen>
    <View style={{ alignItems: "center", marginBottom: 2 }}><CogniLogo compact centered /></View>
    <LinearGradient colors={["rgba(30,40,96,.95)", "rgba(13,19,48,.98)"]} style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 7 }}><Eyebrow>Make Cogni relevant to you</Eyebrow><Title size={29}>Where are you in your journey?</Title><Body muted>Cogni keeps one skill history, but changes the situations it uses to match the decisions you face.</Body></LinearGradient>
    <View style={{ gap: 10 }}>{audiences.map((item) => <Pressable key={item.slug} onPress={() => setAudience(item.slug)} style={({ pressed }) => ({ opacity: pressed ? .78 : 1 })}><View style={{ minHeight: 86, padding: 14, borderRadius: 21, borderCurve: "continuous", borderWidth: 1, borderColor: audience === item.slug ? "rgba(107,92,255,.78)" : colors.line, backgroundColor: audience === item.slug ? "rgba(107,92,255,.15)" : "rgba(16,23,53,.92)", flexDirection: "row", alignItems: "center", gap: 13 }}><LinearGradient colors={audience === item.slug ? ["rgba(0,229,255,.20)", "rgba(184,85,255,.24)"] : ["rgba(32,43,85,.9)", "rgba(20,28,60,.9)"]} style={{ width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 23 }}>{item.icon}</Text></LinearGradient><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>{item.label}</Text><Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 19 }}>{item.text}</Text></View>{audience === item.slug ? <Text style={{ color: colors.cyan, fontSize: 20, fontWeight: "900" }}>✓</Text> : null}</View></Pressable>)}</View>
    {audience ? <Card><Eyebrow>Optional — tailor scenarios further</Eyebrow><Text style={{ color: colors.text, fontWeight: "800" }}>{isStudent ? "Study area" : "Function / discipline"}</Text><TextInput value={functionArea} onChangeText={setFunctionArea} placeholder={isStudent ? "e.g. Economics, Engineering, Law" : "e.g. Finance, Technology, Marketing"} placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800" }}>Industry</Text><TextInput value={industry} onChangeText={setIndustry} placeholder="Optional" placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800" }}>What do you most want to improve?</Text><TextInput value={goal} onChangeText={setGoal} placeholder="e.g. Make better recommendations" placeholderTextColor={colors.soft} style={fieldStyle} /></Card> : null}
    {error ? <Text selectable style={{ color: "#ff9ac0", lineHeight: 21 }}>{error}</Text> : null}<PrimaryButton label={busy ? "Saving…" : "Continue to Cogni"} disabled={!audience || busy} onPress={() => void save()} />
  </Screen>;
}
