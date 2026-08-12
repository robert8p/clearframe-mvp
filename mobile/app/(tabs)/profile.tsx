import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { FormField } from "@/components/form-field";
import { CompactAction } from "@/components/interaction-cues";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gradients } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
const audienceNames: Record<string, string> = { university_student: "University student", graduate_early_career: "Graduate / early career", junior_professional: "Junior professional", management: "Management", executive: "Executive" };

export default function ProfileScreen() {
  const { signOut } = useAuth(); const [data, setData] = useState<MobileProfileResponse | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  const [name, setName] = useState(""); const [functionArea, setFunctionArea] = useState(""); const [industry, setIndustry] = useState(""); const [goal, setGoal] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const result = await apiFetch<MobileProfileResponse>("/api/mobile/profile"); setData(result); setName(result.profile.full_name ?? ""); setFunctionArea(result.profile.function_area ?? ""); setIndustry(result.profile.industry ?? ""); setGoal(result.profile.primary_goal ?? ""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load profile."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />; if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />; if (!data) return null;
  async function save() { if (busy) return; setBusy(true); setError(""); setSaved(""); try { const updated = await apiFetch<MobileProfileResponse>("/api/mobile/profile", { method: "POST", body: JSON.stringify({ fullName: name || null, functionArea: functionArea || null, industry: industry || null, primaryGoal: goal || null }) }); setData(updated); setSaved("Profile updated"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save profile."); } finally { setBusy(false); } }
  async function logout() { await signOut(); router.replace("/"); }
  const initials = (name || data.profile.email || "C").split(/\s+/).map((part) => part[0]).join("").slice(0,2).toUpperCase();
  const xp = data.profile.xp ?? 0; const streak = data.profile.current_streak ?? 0; const answers = data.summary.answers;
  const milestones = [
    { icon: "⚡", label: "100 XP", unlocked: xp >= 100 },
    { icon: "✓", label: "10 answers", unlocked: answers >= 10 },
    { icon: "🔥", label: "3-day streak", unlocked: streak >= 3 },
  ];
  return <Screen>
    <LinearGradient colors={["rgba(38,43,112,.95)", "rgba(15,20,51,.98)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, borderWidth: 1, borderColor: colors.line, padding: 20, alignItems: "center", gap: 10 }}>
      <LinearGradient colors={[...gradients.orb]} style={{ width: 88, height: 88, borderRadius: 44, padding: 4 }}><View style={{ flex: 1, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg2 }}><Text accessibilityLabel={`Profile initials ${initials}`} style={{ color: colors.white, fontSize: 27, fontWeight: "900" }}>{initials}</Text></View></LinearGradient>
      <Title size={27}>{name || "Your Cogni profile"}</Title><Text selectable style={{ color: colors.muted, fontSize: 14.5 }}>{data.profile.email}</Text>{data.profile.audience_segment ? <CompactAction accent label={audienceNames[data.profile.audience_segment] ?? data.profile.audience_segment} hint="Change your learning context" onPress={() => router.push("/onboarding")} /> : null}
      <View accessible accessibilityLabel={`${xp} XP. ${answers} answers. ${streak} day streak.`} style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18, marginTop: 6 }}><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{xp}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>XP</Text></View><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{answers}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>Answers</Text></View><View style={{ alignItems: "center", minWidth: 64 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{streak}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>Streak</Text></View></View>
    </LinearGradient>
    <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Eyebrow>Milestones</Eyebrow><Text style={{ color: colors.soft, fontSize: 12.5 }}>Progress markers</Text></View><View style={{ gap: 0 }}>{milestones.map((item, index) => <View accessible accessibilityLabel={`${item.label}. ${item.unlocked ? "Unlocked" : "Locked"}.`} key={item.label} style={{ minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: index === milestones.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><Text accessible={false} style={{ width: 30, fontSize: 21, textAlign: "center", opacity: item.unlocked ? 1 : .48 }}>{item.icon}</Text><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 21, fontWeight: "800" }}>{item.label}</Text><Text style={{ color: item.unlocked ? colors.green : colors.soft, fontSize: 12.5, lineHeight: 18, fontWeight: "700" }}>{item.unlocked ? "Unlocked" : "Not yet unlocked"}</Text></View><Text accessible={false} style={{ color: item.unlocked ? colors.green : colors.soft, fontSize: 18, fontWeight: "900" }}>{item.unlocked ? "✓" : "○"}</Text></View>)}</View></Card>
    <Card><Eyebrow>Learning context</Eyebrow><Body muted>Changing context never resets your scores, XP, streak or history. It changes the situations Cogni uses next.</Body><PrimaryButton label="Change learning context" secondary onPress={() => router.push("/onboarding")} /></Card>
    <Card><Eyebrow>Personalisation</Eyebrow><Body muted>Keep these details current so Cogni can choose examples closer to your real decisions.</Body><View style={{ gap: 14 }}><FormField label="Name" value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.soft} /><FormField label="Function / study area" value={functionArea} onChangeText={setFunctionArea} placeholder="Optional" placeholderTextColor={colors.soft} /><FormField label="Industry" value={industry} onChangeText={setIndustry} placeholder="Optional" placeholderTextColor={colors.soft} /><FormField label="Primary goal" value={goal} onChangeText={setGoal} placeholder="What do you most want to improve?" placeholderTextColor={colors.soft} /></View>{saved ? <Text accessibilityLiveRegion="polite" style={{ color: colors.green, fontWeight: "800", lineHeight: 22 }}>{saved}</Text> : null}{error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}<PrimaryButton label={busy ? "Saving…" : "Save profile"} disabled={busy} onPress={() => void save()} /></Card>
    <Card><Eyebrow>Account</Eyebrow><Body muted>Signing out keeps your Cogni profile and history safely stored for the next time you sign in.</Body><PrimaryButton label="Sign out" secondary onPress={() => void logout()} /></Card>
  </Screen>;
}
