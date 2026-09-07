import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { ActionLink, Body, Card, Eyebrow, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { RefreshNotice, SkillTile, TrainingCard } from "@/components/learning-surfaces";
import { DailyLens, DeviceToolsNotice, PracticeRhythm, ToolkitShortcut } from "@/components/practice-tools";
import { apiFetch } from "@/lib/api";
import { mobileAudienceMeta } from "@/lib/audience";
import { selectSkills, skillDetails } from "@/lib/learning-view";
import { getTrainingAction } from "@/lib/training-action";
import { useFocusResource } from "@/lib/use-focus-resource";
import { useProGate } from "@/lib/pro-gate";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse, TodayResponse } from "@/lib/types";
async function loadHome(signal: AbortSignal) {
  const [profile, today] = await Promise.all([apiFetch<MobileProfileResponse>("/api/mobile/profile", { signal }), apiFetch<TodayResponse>("/api/mobile/today", { signal })]);
  return { profile, today };
}
export default function HomeScreen() {
  const { data, loading, refreshing, error, reload } = useFocusResource(loadHome);
  const { needsProForFocusedPractice, openFocusedPractice } = useProGate();
  if (loading) return <LoadingState label="Preparing Cogni…" />;
  if (!data) return <Screen><Title size={27}>Let’s reconnect.</Title><Body muted>{error || "Could not load your practice."}</Body><PrimaryButton label="Try again" onPress={() => void reload()} /><ToolkitShortcut /><Body muted style={{ fontSize: 13, lineHeight: 20 }}>Saved ideas on this device are still available. New questions and scores need a connection.</Body></Screen>;
  const { profile, today } = data;
  if (!profile.profile.audience_segment || today.state === "onboarding") return <Redirect href="/onboarding" />;
  const firstName = profile.profile.full_name?.trim().split(/\s+/)[0] || "there";
  const meta = mobileAudienceMeta(profile.profile.audience_segment);
  const action = getTrainingAction(today);
  const next = selectSkills(profile.skillScores, "", "practised").slice(0, 2);
  const average = profile.summary.averageScore;
  return <Screen refreshing={refreshing} onRefresh={() => void reload()}>
    <View style={{ gap: 6 }}><Eyebrow>{meta?.shortLabel ?? "Your daily practice"}</Eyebrow><Title size={29}>Hello, {firstName}</Title><Body muted style={{ fontSize: 15, lineHeight: 22 }}>One useful idea for your next real decision.</Body></View>
    {error ? <RefreshNotice message={error} onRetry={() => void reload()} /> : null}
    <TrainingCard today={today} busy={refreshing} onPress={() => action.href ? router.navigate(action.href) : void reload()} />
    <DeviceToolsNotice />
    <ToolkitShortcut />
    <DailyLens audience={profile.profile.audience_segment} />
    <PracticeRhythm />
    <Card><Eyebrow>Progress you can inspect</Eyebrow><Title size={23}>{average === null ? "Your starting point is taking shape" : `${Math.round(average * 100)}% recent performance`}</Title><Text style={{ color: colors.cyan, fontSize: 14, lineHeight: 22, fontWeight: "700" }}>{profile.summary.answers} answers saved · {profile.profile.xp ?? 0} practice XP</Text><Body muted style={{ fontSize: 14, lineHeight: 22 }}>{average === null ? "Your first answers begin your skill map. There is nothing to catch up on." : "Based on your latest up to 200 answers, not a measure of intelligence or a ranking against other people."}</Body><ActionLink label="View progress" hint="Explore the evidence and history behind your skill scores" onPress={() => router.navigate("/(tabs)/progress")} /></Card>
    <View style={{ gap: 12 }}><View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}><Title size={23}>Choose your next focus</Title><ActionLink label="See all skills" onPress={() => router.navigate("/(tabs)/skills")} /></View>
      {next.length ? <><Body muted style={{ fontSize: 14, lineHeight: 21 }}>These are possible practice areas based on your measured scores—not proven weaknesses.</Body>{next.map(row => <SkillTile key={row.skill_id} row={row} pro={needsProForFocusedPractice} onPress={() => { const slug = skillDetails(row)?.slug; if (slug) openFocusedPractice(slug, "home_focus"); }} />)}</> : <Body muted>Explore thinking skills, or use the starting check above for a more personal starting point.</Body>}
    </View>
  </Screen>;
}
