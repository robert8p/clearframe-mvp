import React, { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { colors, gradients } from "@/lib/theme";
import type { MobileProfileResponse, TodayResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, MetricCard, Pill, PrimaryButton, ProgressRing, Screen, SkillBar, Title } from "@/components/ui";
import { CogniOrb } from "@/components/orb";

const audienceNames: Record<string, string> = { university_student: "University", graduate_early_career: "Graduate / early career", junior_professional: "Junior professional", management: "Management", executive: "Executive" };
const audiencePromise: Record<string, string> = { university_student: "Build the thinking skills that improve study, AI use and graduate readiness.", graduate_early_career: "Build the judgement that makes people trust your work.", junior_professional: "Turn analysis into stronger recommendations and decisions.", management: "Make clearer decisions about people, priorities, resources and risk.", executive: "Sharpen strategic judgement under uncertainty." };
function skillRelation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }

function QuickAction({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, minWidth: 72, opacity: pressed ? .78 : 1 })}><View style={{ minHeight: 78, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(16,23,53,.94)", alignItems: "center", justifyContent: "center", gap: 7, padding: 10 }}><LinearGradient colors={["rgba(0,229,255,.16)", "rgba(107,92,255,.22)"]} style={{ width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>{icon}</Text></LinearGradient><Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{label}</Text></View></Pressable>;
}

export default function HomeScreen() {
  const [profile, setProfile] = useState<MobileProfileResponse | null>(null); const [today, setToday] = useState<TodayResponse | null>(null); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => { if (refresh) setRefreshing(true); else setLoading(true); setError(""); try { const [profileData, todayData] = await Promise.all([apiFetch<MobileProfileResponse>("/api/mobile/profile"), apiFetch<TodayResponse>("/api/mobile/today")]); setProfile(profileData); setToday(todayData); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load Cogni."); } finally { setLoading(false); setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Preparing Cogni…" />; if (error && !profile) return <ErrorState message={error} onRetry={() => void load()} />; if (!profile?.profile.audience_segment || today?.state === "onboarding") return <Redirect href="/onboarding" />;

  const firstName = profile.profile.full_name?.trim().split(/\s+/)[0] || "there";
  const audience = profile.profile.audience_segment;
  const lowest = [...profile.skillScores].sort((a,b) => Number(a.score) - Number(b.score)).slice(0,3);
  const average = profile.summary.averageScore == null ? 0 : Math.round(profile.summary.averageScore * 100);
  const stateCopy: Record<string, { eyebrow: string; title: string; body: string; cta: string }> = {
    diagnostic: { eyebrow: "Your starting check", title: "Map your strongest starting point", body: "A short starting check helps Cogni choose the skills worth focusing on first.", cta: "Continue starting check" },
    lesson: { eyebrow: "Today’s focus", title: "A fresh thinking move is ready", body: "Start with one short idea, then put it to work in today’s decisions.", cta: "Start today’s insight" },
    training: { eyebrow: "Today’s focus", title: "Your next decisions are ready", body: "Cogni has selected situations around the skills that will give you the most value today.", cta: "Continue training" },
    complete: { eyebrow: "Daily goal complete", title: "Momentum built. Keep going if you want", body: "Your core session is done. Pick a skill for another short practice round.", cta: "Keep training" },
    unavailable: { eyebrow: "Today’s focus", title: "Almost ready", body: today?.message ?? "Cogni is preparing the next set.", cta: "Try again" },
  };
  const copy = stateCopy[today?.state ?? "unavailable"] ?? stateCopy.unavailable;
  function openTraining() { if (today?.state === "complete") router.push("/(tabs)/skills"); else if (today?.state === "unavailable") void load(true); else router.push("/(tabs)/train"); }

  return <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -.8 }}>Hello, {firstName} 👋</Text><Text style={{ color: colors.muted, fontSize: 14.5, lineHeight: 21 }}>{audiencePromise[audience] ?? "Build clearer judgement for the decisions you face."}</Text></View>
      <View style={{ alignItems: "flex-end", gap: 7 }}><Pill accent>🔥 {profile.profile.current_streak ?? 0}</Pill><Pill>{audienceNames[audience] ?? audience}</Pill></View>
    </View>

    <Card style={{ padding: 0, overflow: "hidden", borderColor: "rgba(72,86,164,.72)" }}>
      <LinearGradient colors={["rgba(34,48,110,.96)", "rgba(12,18,48,.98)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1, gap: 7 }}><Eyebrow>{copy.eyebrow}</Eyebrow><Title size={25}>{copy.title}</Title><Body muted style={{ fontSize: 14.5, lineHeight: 21 }}>{copy.body}</Body></View><View style={{ marginRight: -22 }}><CogniOrb size={92} /></View></View>
        <View style={{ marginTop: 10 }}><PrimaryButton label={copy.cta} onPress={openTraining} /></View>
      </LinearGradient>
    </Card>

    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><ProgressRing value={average} label="profile" /><View style={{ flex: 1, gap: 5 }}><Eyebrow>Your progress</Eyebrow><Title size={22}>{average ? `${average}% recent score` : "Your profile is forming"}</Title><Body muted style={{ fontSize: 13.5, lineHeight: 19 }}>{profile.summary.answers ? `${profile.summary.answers} answers are shaping your Cogni profile.` : "Complete your starting check to create your first profile."}</Body></View></View>

    <View style={{ flexDirection: "row", gap: 10 }}><MetricCard label="XP" value={profile.profile.xp ?? 0} hint="earned from practice" /><MetricCard label="Answers" value={profile.summary.answers} hint="evidence collected" /></View>

    <View style={{ gap: 9 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Eyebrow>Quick actions</Eyebrow><Text style={{ color: colors.soft, fontSize: 12, fontWeight: "700" }}>Choose your next move</Text></View><View style={{ flexDirection: "row", gap: 9 }}><QuickAction label="Train" icon="▶" onPress={() => router.push("/(tabs)/train")} /><QuickAction label="Skills" icon="◇" onPress={() => router.push("/(tabs)/skills")} /><QuickAction label="Progress" icon="▥" onPress={() => router.push("/(tabs)/progress")} /><QuickAction label="Profile" icon="◎" onPress={() => router.push("/(tabs)/profile")} /></View></View>

    {lowest.length ? <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Eyebrow>Recommended for you</Eyebrow><Text onPress={() => router.push("/(tabs)/skills")} style={{ color: colors.purple, fontSize: 13, fontWeight: "900" }}>See all</Text></View><Title size={23}>Skills worth sharpening next</Title>{lowest.map((row) => { const skill = skillRelation(row.skills); return <SkillBar key={row.skill_id} label={skill?.name ?? "Skill"} score={Number(row.score)} reliability={Number(row.reliability)} />; })}<PrimaryButton label="Explore skills" secondary onPress={() => router.push("/(tabs)/skills")} /></Card> : null}
    {error ? <Text selectable style={{ color: "#ff9ac0" }}>{error}</Text> : null}
  </Screen>;
}
