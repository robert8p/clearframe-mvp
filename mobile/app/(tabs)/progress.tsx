import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusResource } from "@/lib/use-focus-resource";
import { RefreshNotice } from "@/components/learning-surfaces";
import { AchievementShelf } from "@/components/achievements";
import { ProgressHistoryCard, ScoreExplainer, type ProgressHistory } from "@/components/progress-history";
import { apiFetch } from "@/lib/api";
import { useProGate } from "@/lib/pro-gate";
import { ToolkitShortcut } from "@/components/practice-tools";
import { CogniIcon } from "@/components/visuals";
import { colors, glow, radius, typography } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, EditorialPanel, Eyebrow, ErrorState, LoadingState, MetricCard, PrimaryButton, ProgressRing, Screen, SectionHeader, SkillBar, Title } from "@/components/ui";

function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }
async function loadProgress(signal: AbortSignal) {
  const [profile, historyResult] = await Promise.all([
    apiFetch<MobileProfileResponse>("/api/mobile/profile", { signal }),
    apiFetch<ProgressHistory>("/api/mobile/progress-history", { signal }).then(history => ({ history, error: "" })).catch((error: unknown) => ({ history: null, error: error instanceof Error ? error.message : "Progress history is unavailable." })),
  ]);
  return { profile, ...historyResult };
}

export default function ProgressScreen() {
  const { fontScale, width } = useWindowDimensions();
  const { data: resource, loading, refreshing, error, reload } = useFocusResource(loadProgress);
  const { needsProForFocusedPractice, isPro, openFocusedPractice, openPaywall } = useProGate();
  const data = resource?.profile; const history = resource?.history ?? null;
  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message={error || "Could not load progress."} onRetry={() => void reload()} />;

  const average = data.summary.averageScore == null ? null : Math.round(data.summary.averageScore * 100);
  const measured = data.skillScores.filter(row => row.attempts > 0);
  const measuredCount = data.summary.measuredSkills ?? measured.length;
  const masteryScore = data.summary.masteryScore == null ? null : Math.round(data.summary.masteryScore);
  const next = [...measured].sort((a, b) => Number(a.score) - Number(b.score))[0];
  const nextSkill = next ? relation(next.skills) : null; const nextSkillSlug = nextSkill?.slug;
  const streak = data.profile.current_streak ?? 0;

  return <Screen refreshing={refreshing} onRefresh={() => void reload()}>
    {error ? <RefreshNotice message={error} onRetry={() => void reload()} /> : null}
    <View style={{ gap: 5 }}><Eyebrow>Progress · mastery · achievements</Eyebrow><Title>Your learning, in orbit</Title><Body muted style={{ maxWidth: 620 }}>See your streak, topic mastery, unlocked milestones and the evidence behind each score.</Body></View>

    <LinearGradient colors={["rgba(37,99,235,.38)", "rgba(139,92,246,.22)", "rgba(15,23,42,.96)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(111,168,255,.36)", padding: 20, gap: 18, overflow: "hidden", boxShadow: glow.blue }}>
      <View style={{ flexDirection: fontScale > 1.25 || width < 360 ? "column" : "row", alignItems: "center", gap: 18 }}>
        <ProgressRing value={average} label="recent" />
        <View style={{ flex: 1, gap: 7, alignSelf: "stretch", justifyContent: "center" }}><Eyebrow>Recent performance</Eyebrow><Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, ...typography.heading }}>{average !== null ? "Your profile is taking shape" : "Your profile starts with practice"}</Text><Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 20, ...typography.body }}>{measuredCount} measured topics · latest up to 200 answers</Text></View>
      </View>
      <View style={{ height: 1, backgroundColor: colors.line }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 18 }}><MetricCard label="XP" value={data.profile.xp ?? 0} hint="earned" /><MetricCard label="Streak" value={`${streak}d`} hint="current" /><MetricCard label="Mastery" value={masteryScore === null ? "—" : masteryScore} hint="topic average" /><MetricCard label="Answers" value={data.summary.answers} hint="saved" /></View>
    </LinearGradient>

    <LinearGradient colors={streak > 0 ? ["rgba(245,158,11,.18)", "rgba(139,92,246,.10)", "rgba(15,23,42,.90)"] : ["rgba(18,33,61,.86)", "rgba(15,23,42,.92)"]} style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: streak > 0 ? "rgba(245,158,11,.32)" : colors.line, padding: 17, flexDirection: "row", alignItems: "center", gap: 14, boxShadow: streak > 0 ? glow.warm : undefined }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: streak > 0 ? "rgba(245,158,11,.10)" : "rgba(71,85,105,.22)", borderWidth: 1, borderColor: streak > 0 ? "rgba(245,158,11,.38)" : colors.line, alignItems: "center", justifyContent: "center" }}><CogniIcon name="spark" size={24} color={streak > 0 ? colors.gold : colors.soft} /></View>
      <View style={{ flex: 1, gap: 3 }}><Eyebrow style={{ color: streak > 0 ? colors.gold : colors.cyan }}>Learning momentum</Eyebrow><Text style={{ color: colors.text, fontSize: 22, ...typography.metric }}>{streak} day{streak === 1 ? "" : "s"}</Text><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, ...typography.body }}>{streak > 0 ? "Keep the connection alive with useful practice—not pressure." : "Your next completed practice can begin a new streak."}</Text></View>
    </LinearGradient>

    <AchievementShelf achievements={data.achievements ?? []} title="Achievements" />

    <View style={{ gap: 11 }}><SectionHeader title="Saved ideas" /><ToolkitShortcut /></View>

    {resource?.error ? <EditorialPanel><Eyebrow>History unavailable</Eyebrow><Body muted>Your current scores are available, but history could not be loaded. It has not been reset.</Body><PrimaryButton label="Retry history" secondary onPress={() => void reload()} /></EditorialPanel> : null}
    {history ? <ProgressHistoryCard history={history} showUpgrade={history.access === "limited" && !isPro} onUpgrade={() => openPaywall("progress_history", "progress_history")} /> : null}

    <View style={{ gap: 12 }}><SectionHeader title="Topic mastery" /><EditorialPanel>{measured.length ? [...measured].sort((a, b) => Number(a.score) - Number(b.score)).map((row, index) => <View key={row.skill_id} style={{ gap: 12 }}>{index ? <View style={{ height: 1, backgroundColor: colors.line }} /> : null}<SkillBar label={relation(row.skills)?.name ?? "Topic"} score={Number(row.score)} reliability={Number(row.reliability)} /></View>) : <Body muted>Complete your starting check to begin tracking your topic progress.</Body>}</EditorialPanel></View>

    {nextSkill && nextSkillSlug ? <EditorialPanel style={{ borderColor: "rgba(34,211,238,.30)", boxShadow: glow.cyan }}><View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(34,211,238,.09)", borderWidth: 1, borderColor: "rgba(34,211,238,.25)", alignItems: "center", justifyContent: "center" }}><CogniIcon name="train" size={24} color={colors.cyan} /></View><View style={{ flex: 1 }}><Eyebrow>Practice focus</Eyebrow></View></View><Title size={23}>Sharpen {nextSkill.name}</Title><Body muted>{needsProForFocusedPractice ? "Your daily core training remains free. Cogni Pro unlocks additional focused rounds on a topic you choose to practise." : "This is one of your lower measured topic scores. Use it as a possible focus, not a judgement."}</Body><PrimaryButton label={needsProForFocusedPractice ? `Unlock practice for ${nextSkill.name}` : `Practise ${nextSkill.name}`} onPress={() => openFocusedPractice(nextSkillSlug, "progress_next_move")} /></EditorialPanel> : null}
    <ScoreExplainer />
  </Screen>;
}
