import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionLink, Body, EditorialPanel, Eyebrow, HeroPanel, LoadingState, PrimaryButton, Screen, SectionHeader, Title } from "@/components/ui";
import { RefreshNotice, SkillShelf, SkillTile, TrainingCard } from "@/components/learning-surfaces";
import { DailyLens, DeviceToolsNotice, PracticeRhythm, ToolkitShortcut } from "@/components/practice-tools";
import { CogniLogo, CogniMark } from "@/components/brand";
import { CogniIcon } from "@/components/visuals";
import { apiFetch } from "@/lib/api";
import { mobileAudienceMeta } from "@/lib/audience";
import { selectSkills, skillDetails } from "@/lib/learning-view";
import { getTrainingAction } from "@/lib/training-action";
import { useFocusResource } from "@/lib/use-focus-resource";
import { useProGate } from "@/lib/pro-gate";
import { colors, glow, radius, typography } from "@/lib/theme";
import type { MobileProfileResponse, TodayResponse } from "@/lib/types";

async function loadHome(signal: AbortSignal) {
  const [profile, today] = await Promise.all([
    apiFetch<MobileProfileResponse>("/api/mobile/profile", { signal }),
    apiFetch<TodayResponse>("/api/mobile/today", { signal }),
  ]);
  return { profile, today };
}

function Stat({ label, value, icon }: { label: string; value: string; icon: "spark" | "progress" | "skills" }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, minWidth: 86, minHeight: 86, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(15,23,42,.86)", alignItems: "center", justifyContent: "center", gap: 5 }}><CogniIcon name={icon} size={20} color={icon === "spark" ? colors.gold : colors.cyan} /><Text style={{ color: colors.text, fontSize: 20, lineHeight: 24, ...typography.metric }}>{value}</Text><Text style={{ color: colors.muted, fontSize: 11.5, lineHeight: 16, ...typography.body, textAlign: "center" }}>{label}</Text></View>;
}

export default function HomeScreen() {
  const { data, loading, refreshing, error, reload } = useFocusResource(loadHome);
  const { needsProForFocusedPractice, openFocusedPractice } = useProGate();
  const insets = useSafeAreaInsets();
  if (loading) return <LoadingState label="Preparing Cogni…" />;
  if (!data) return <Screen><Title size={27}>Let&apos;s reconnect.</Title><Body muted>{error || "Could not load your practice."}</Body><PrimaryButton label="Try again" onPress={() => void reload()} /><ToolkitShortcut /><Body muted style={{ fontSize: 13, lineHeight: 20 }}>Saved ideas on this device are still available. New questions and scores need a connection.</Body></Screen>;

  const { profile, today } = data;
  if (!profile.profile.audience_segment || today.state === "onboarding") return <Redirect href="/onboarding" />;
  const firstName = profile.profile.full_name?.trim().split(/\s+/)[0] || "there";
  const meta = mobileAudienceMeta(profile.profile.audience_segment);
  const action = getTrainingAction(today);
  const next = selectSkills(profile.skillScores, "", "practised").slice(0, 2);
  const average = profile.summary.averageScore;
  const recent = average === null ? "—" : `${Math.round(average * 100)}%`;

  return <Screen contentStyle={{ paddingTop: insets.top + 12 }} refreshing={refreshing} onRefresh={() => void reload()}>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <View style={{ gap: 4, flex: 1 }}><CogniLogo compact animated={false} /><Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18, ...typography.body }}>{meta?.shortLabel ?? "Small practice. A sharper you."}</Text></View>
      <View accessibilityLabel={`${profile.profile.current_streak ?? 0} day streak`} style={{ minWidth: 48, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: "rgba(245,158,11,.38)", backgroundColor: "rgba(245,158,11,.08)", alignItems: "center", justifyContent: "center", boxShadow: profile.profile.current_streak ? glow.warm : undefined }}><CogniIcon name="spark" size={20} color={profile.profile.current_streak ? colors.gold : colors.soft} /></View>
    </View>

    <HeroPanel eyebrow="Today" title={`A brighter day, ${firstName}`} body={meta?.text ?? "A few focused minutes can move your learning forward."} minHeight={0} renderArtwork={(size) => <CogniMark size={size} />} footer={<View style={{ height: 1, backgroundColor: "rgba(148,163,184,.16)" }} />} />

    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      <Stat label="day streak" value={String(profile.profile.current_streak ?? 0)} icon="spark" />
      <Stat label="recent performance" value={recent} icon="progress" />
      <Stat label="practice XP" value={String(profile.profile.xp ?? 0)} icon="skills" />
    </View>

    {error ? <RefreshNotice message={error} onRetry={() => void reload()} /> : null}
    <View style={{ gap: 10 }}><Eyebrow>Your next best action</Eyebrow><TrainingCard today={today} busy={refreshing} label={action.label} onPress={() => action.href ? router.navigate(action.href) : void reload()} /></View>

    <SkillShelf rows={profile.skillScores} pro={needsProForFocusedPractice} onOpen={slug => openFocusedPractice(slug, "home_skill_shelf")} />
    <PracticeRhythm />

    <View style={{ gap: 12 }}><SectionHeader title="Keep going" /><ToolkitShortcut /><DailyLens audience={profile.profile.audience_segment} /></View>
    <DeviceToolsNotice />

    <EditorialPanel style={{ borderColor: "rgba(34,211,238,.25)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Eyebrow>Your progress</Eyebrow><Title size={22}>{average === null ? "Your starting point is taking shape" : `${Math.round(average * 100)}% recent performance`}</Title><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, ...typography.body }}>{profile.summary.answers} answers saved · {profile.profile.xp ?? 0} practice XP</Text></View><View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(34,211,238,.08)", borderWidth: 1, borderColor: "rgba(34,211,238,.24)" }}><CogniIcon name="progress" size={27} color={colors.cyan} /></View></View>
      <Body muted style={{ fontSize: 13, lineHeight: 20 }}>{average === null ? "Your first answers begin your topic map. There is nothing to catch up on." : "Based on your latest up to 200 answers—not a measure of intelligence or a ranking against other people."}</Body>
      <ActionLink label="View progress" hint="Explore the evidence and history behind your topic scores" onPress={() => router.navigate("/(tabs)/progress")} />
    </EditorialPanel>

    {next.length ? <View style={{ gap: 12 }}><SectionHeader title="Choose your next focus" action={<ActionLink label="Browse topics" onPress={() => router.navigate("/(tabs)/skills")} />} />{next.map(row => <SkillTile key={row.skill_id} row={row} pro={needsProForFocusedPractice} onPress={() => { const slug = skillDetails(row)?.slug; if (slug) openFocusedPractice(slug, "home_focus"); }} />)}</View> : null}
  </Screen>;
}
