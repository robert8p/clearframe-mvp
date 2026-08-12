import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, gradients } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, fieldStyle, LoadingState, Pill, PrimaryButton, Screen, Title } from "@/components/ui";
const audienceNames: Record<string, string> = { university_student: "University student", graduate_early_career: "Graduate / early career", junior_professional: "Junior professional", management: "Management", executive: "Executive" };

export default function ProfileScreen() {
  const { signOut } = useAuth(); const [data, setData] = useState<MobileProfileResponse | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  const [name, setName] = useState(""); const [functionArea, setFunctionArea] = useState(""); const [industry, setIndustry] = useState(""); const [goal, setGoal] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const result = await apiFetch<MobileProfileResponse>("/api/mobile/profile"); setData(result); setName(result.profile.full_name ?? ""); setFunctionArea(result.profile.function_area ?? ""); setIndustry(result.profile.industry ?? ""); setGoal(result.profile.primary_goal ?? ""); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load profile."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />; if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />; if (!data) return null;
  async function save() { setBusy(true); setError(""); setSaved(""); try { const updated = await apiFetch<MobileProfileResponse>("/api/mobile/profile", { method: "POST", body: JSON.stringify({ fullName: name || null, functionArea: functionArea || null, industry: industry || null, primaryGoal: goal || null }) }); setData(updated); setSaved("Profile updated"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save profile."); } finally { setBusy(false); } }
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
      <LinearGradient colors={[...gradients.orb]} style={{ width: 88, height: 88, borderRadius: 44, padding: 4 }}><View style={{ flex: 1, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg2 }}><Text style={{ color: colors.white, fontSize: 27, fontWeight: "900" }}>{initials}</Text></View></LinearGradient>
      <Title size={27}>{name || "Your Cogni profile"}</Title><Text selectable style={{ color: colors.muted, fontSize: 14 }}>{data.profile.email}</Text>{data.profile.audience_segment ? <Pill accent>{audienceNames[data.profile.audience_segment] ?? data.profile.audience_segment}</Pill> : null}
      <View style={{ flexDirection: "row", gap: 20, marginTop: 6 }}><View style={{ alignItems: "center" }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{xp}</Text><Text style={{ color: colors.soft, fontSize: 11.5 }}>XP</Text></View><View style={{ width: 1, backgroundColor: colors.line }} /><View style={{ alignItems: "center" }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{answers}</Text><Text style={{ color: colors.soft, fontSize: 11.5 }}>Answers</Text></View><View style={{ width: 1, backgroundColor: colors.line }} /><View style={{ alignItems: "center" }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: "900" }}>{streak}</Text><Text style={{ color: colors.soft, fontSize: 11.5 }}>Streak</Text></View></View>
    </LinearGradient>
    <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Eyebrow>Milestones</Eyebrow><Text style={{ color: colors.soft, fontSize: 12 }}>Built from real progress</Text></View><View style={{ flexDirection: "row", gap: 9 }}>{milestones.map((item) => <View key={item.label} style={{ flex: 1, minHeight: 86, borderRadius: 18, borderWidth: 1, borderColor: item.unlocked ? "rgba(107,92,255,.65)" : colors.line, backgroundColor: item.unlocked ? "rgba(107,92,255,.13)" : "rgba(16,23,53,.7)", alignItems: "center", justifyContent: "center", gap: 6, opacity: item.unlocked ? 1 : .45 }}><Text style={{ fontSize: 22 }}>{item.icon}</Text><Text style={{ color: colors.text, fontSize: 11.5, textAlign: "center", fontWeight: "800" }}>{item.label}</Text></View>)}</View></Card>
    <Card><Eyebrow>Learning context</Eyebrow><Body muted>Changing context never resets your scores, XP, streak or history. It changes the situations Cogni uses next.</Body><PrimaryButton label="Change learning context" secondary onPress={() => router.push("/onboarding")} /></Card>
    <Card><Eyebrow>Make Cogni more relevant</Eyebrow><Text style={{ color: colors.text, fontWeight: "800" }}>Name</Text><TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800" }}>Function / study area</Text><TextInput value={functionArea} onChangeText={setFunctionArea} placeholder="Optional" placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800" }}>Industry</Text><TextInput value={industry} onChangeText={setIndustry} placeholder="Optional" placeholderTextColor={colors.soft} style={fieldStyle} /><Text style={{ color: colors.text, fontWeight: "800" }}>Primary goal</Text><TextInput value={goal} onChangeText={setGoal} placeholder="What do you most want to improve?" placeholderTextColor={colors.soft} style={fieldStyle} />{saved ? <Text style={{ color: colors.green, fontWeight: "800" }}>{saved}</Text> : null}{error ? <Text selectable style={{ color: "#ff9ac0" }}>{error}</Text> : null}<PrimaryButton label={busy ? "Saving…" : "Save profile"} disabled={busy} onPress={() => void save()} /></Card>
    <PrimaryButton label="Sign out" secondary onPress={() => void logout()} />
  </Screen>;
}
