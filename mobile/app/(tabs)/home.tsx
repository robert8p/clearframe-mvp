import React, { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CompactAction } from "@/components/interaction-cues";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse, TodayResponse } from "@/lib/types";
import { ActionLink, Body, Card, Eyebrow, ErrorState, LoadingState, MetricCard, PrimaryButton, ProgressRing, Screen, SkillBar, Title } from "@/components/ui";
import { CogniOrb } from "@/components/orb";

const audienceNames: Record<string, string> = { university_student: "University", graduate_early_career: "Graduate / early career", junior_professional: "Junior professional", management: "Management", executive: "Executive" };
const audiencePromise: Record<string, string> = { university_student: "Build the thinking skills that improve study, AI use and graduate readiness.", graduate_early_career: "Build the judgement that makes people trust your work.", junior_professional: "Turn analysis into stronger recommendations and decisions.", management: "Make clearer decisions about people, priorities, resources and risk.", executive: "Sharpen strategic judgement under uncertainty." };
function skillRelation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }

export default function HomeScreen() {
  const [profile, setProfile] = useState<MobileProfileResponse | null>(null); const [today, setToday] = useState<TodayResponse | null>(null); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => { if (refresh) setRefreshing(true); else setLoading(true); setError(""); try { const [profileData, todayData] = await Promise.all([apiFetch<MobileProfileResponse>("/api/mobile/profile"), apiFetch<TodayResponse>("/api/mobile/today")]); setProfile(profileData); setToday(todayData); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load Cogni."); } finally { setLoading(false); setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Preparing Cogni…" />; if (error && !profile) return <ErrorState message={error} onRetry={() => void load()} />; if (!profile?.profile.audience_segment || today?.state === "onboarding") return <Redirect href="/onboarding" />;

  const firstName = profile.profile.full_name?.trim().split(/\s+/)[0] || "there";
  const audience = profile.profile.audience_segment;
  const lowest = [...profile.skillScores].sort((a,b) => Number(a.score) - Number(b.score)).slice(0,3);
  const average = profile.summary.averageScore == null ? 0 : Math.round(profile.summary.averageScore * 100);
  const streak = profile.profile.current_streak ?? 0;
  const streakLabel = `${streak} ${streak === 1 ? "day" : "days"} streak`;
  const stateCopy: Record<string, { eyebrow: string; title: string; body: string; cta: string }> = {
    diagnostic: { eyebrow: "Your starting check", title: "Map your strongest starting point", body: "A short starting check helps Cogni choose the skills worth focusing on first.", cta: "Continue starting check" },
    lesson: { eyebrow: "Today’s focus", title: "A fresh thinking move is ready", body: "Start with one short idea, then put it to work in today’s decisions.", cta: "Start today’s insight" },
    training: { eyebrow: "Today’s focus", title: "Your next decisions are ready", body: "Cogni has selected situations around the skills that will give you the most value today.", cta: "Continue training" },
    complete: { eyebrow: "Daily goal complete", title: "Momentum built. Keep going if you want", body: "Your core session is done. Pick a skill for another short practice round.", cta: "Keep training" },
    unavailable: { eyebrow: "Today’s focus", title: "Almost ready", body: today?.message ?? "Cogni is preparing the next set.", cta: "Try again" },
  };
  const copy = stateCopy[today?.state ?? "unavailable"] ?? stateCopy.unavailable;
  function openTraining() { if (today?.state === "complete") router.push("/(tabs)/skills"); else if (today?.state === "unavailable") void load(true); else router.push("/(tabs)/train"); }
  const openProgress = () => router.push("/(tabs)/progress");

  return <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
    <View style={{ gap: 10 }}>
      <View style={{ gap: 5 }}><Title size={29}>Hello, {firstName} 👋</Title><Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>{audiencePromise[audience] ?? "Build clearer judgement for the decisions you face."}</Text></View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <CompactAction label={`🔥 ${streakLabel}`} accent hint="Open your progress and streak details" onPress={openProgress} />
        <CompactAction label={audienceNames[audience] ?? audience} hint="Open your profile and learning context" onPress={() => router.push("/(tabs)/profile")} />
      </View>
    </View>

    <Card style={{ padding: 0, overflow: "hidden", borderColor: "rgba(83,105,165,.76)" }}>
      <LinearGradient colors={["rgba(34,48,110,.96)", "rgba(12,18,48,.98)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1, gap: 7 }}><Eyebrow>{copy.eyebrow}</Eyebrow><Title size={25}>{copy.title}</Title><Body muted style={{ fontSize: 15, lineHeight: 22 }}>{copy.body}</Body></View><View accessible={false} style={{ marginRight: -22 }}><CogniOrb size={88} /></View></View>
        <View style={{ marginTop: 10 }}><PrimaryButton label={copy.cta} onPress={openTraining} /></View>
      </LinearGradient>
    </Card>

    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}><ProgressRing value={average} label="recent" /><View style={{ flex: 1, gap: 5 }}><Eyebrow>Your evidence</Eyebrow><Title size={22}>{average ? `${average}% recent score` : "Your profile is forming"}</Title><Body muted style={{ fontSize: 14, lineHeight: 20 }}>{profile.summary.answers ? `${profile.summary.answers} answers are shaping your skill profile. Scores can move as Cogni collects better evidence.` : "Complete your starting check to create your first skill profile."}</Body></View></View>
      <View style={{ alignItems: "flex-end" }}><ActionLink label="View progress" hint="Open your full progress page" onPress={openProgress} /></View>
    </View>

    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${profile.profile.xp ?? 0} XP`} accessibilityHint="Open your progress" onPress={openProgress} style={({ pressed }) => ({ flexGrow: 1, flexBasis: 150, opacity: pressed ? .78 : 1 })}><MetricCard label="XP" value={profile.profile.xp ?? 0} hint="earned from practice" /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${profile.summary.answers} answers`} accessibilityHint="Open your progress" onPress={openProgress} style={({ pressed }) => ({ flexGrow: 1, flexBasis: 150, opacity: pressed ? .78 : 1 })}><MetricCard label="Answers" value={profile.summary.answers} hint="evidence collected" /></Pressable>
    </View>

    {lowest.length ? <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Eyebrow>Recommended for you</Eyebrow><ActionLink label="See all" hint="Open all skills" onPress={() => router.push("/(tabs)/skills")} /></View><Title size={23}>Skills worth sharpening next</Title>{lowest.map((row) => { const skill = skillRelation(row.skills); return <SkillBar key={row.skill_id} label={skill?.name ?? "Skill"} score={Number(row.score)} reliability={Number(row.reliability)} />; })}<PrimaryButton label="Explore skills" secondary onPress={() => router.push("/(tabs)/skills")} /></Card> : null}
    {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, lineHeight: 22 }}>{error}</Text> : null}
  </Screen>;
}
