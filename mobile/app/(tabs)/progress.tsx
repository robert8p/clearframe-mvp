import React from "react";
import { useFocusResource } from "@/lib/use-focus-resource";
import { RefreshNotice } from "@/components/learning-surfaces";
import { ProgressHistoryCard, ScoreExplainer, type ProgressHistory } from "@/components/progress-history";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { useProGate } from "@/lib/pro-gate";
import { ToolkitShortcut } from "@/components/practice-tools";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, MetricCard, PrimaryButton, ProgressRing, Screen, SkillBar, Title } from "@/components/ui";

function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) {
  return Array.isArray(value) ? value[0] : value;
}

async function loadProgress(signal: AbortSignal) {
  const [profile, historyResult] = await Promise.all([
    apiFetch<MobileProfileResponse>("/api/mobile/profile", {signal}),
    apiFetch<ProgressHistory>("/api/mobile/progress-history", {signal}).then(history => ({history,error:""})).catch((error:unknown) => ({history:null,error:error instanceof Error ? error.message : "Progress history is unavailable."})),
  ]);
  return {profile,...historyResult};
}
export default function ProgressScreen() {
  const {fontScale,width} = useWindowDimensions();
  const {data:resource,loading,refreshing,error,reload} = useFocusResource(loadProgress);
  const { needsProForFocusedPractice, isPro, openFocusedPractice, openPaywall } = useProGate();
  const data = resource?.profile;
  const history = resource?.history ?? null;
  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message={error || "Could not load progress."} onRetry={() => void reload()} />;

  const average = data.summary.averageScore == null ? null : Math.round(data.summary.averageScore * 100);
  const measured = data.skillScores.filter((row) => row.attempts > 0);
  const next = [...measured].sort((a, b) => Number(a.score) - Number(b.score))[0];
  const nextSkill = next ? relation(next.skills) : null;
  const nextSkillSlug = nextSkill?.slug;

  return <Screen refreshing={refreshing} onRefresh={() => void reload()}>
    {error ? <RefreshNotice message={error} onRetry={() => void reload()} /> : null}
    <View style={{ gap: 5 }}>
      <Eyebrow>Your progress</Eyebrow>
      <Title>Your progress, in perspective</Title>
      <Body muted>Your answers help Cogni build your skill profile. Read each score alongside its evidence level, rather than as a fixed grade.</Body>
    </View>

    <LinearGradient colors={["#243c72", "#25214d"]} style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, flexDirection: fontScale>1.25 || width<360 ? "column" : "row", alignItems: "center", gap: 16 }}>
      <ProgressRing value={average} label="recent" />
      <View style={{ flex: 1, gap: 6 }}>
        <Eyebrow>Recent performance</Eyebrow>
        <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "900" }}>{average !== null ? "Your profile is taking shape" : "No score yet"}</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{measured.length} measured skills · latest up to 200 answers</Text>
      </View>
    </LinearGradient>

    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      <View style={{ flexGrow: 1, flexBasis: 150 }}><MetricCard label="XP" value={data.profile.xp ?? 0} hint="total earned" /></View>
      <View style={{ flexGrow: 1, flexBasis: 150 }}><MetricCard label="Streak" value={`${data.profile.current_streak ?? 0}d`} hint="current run" /></View>
    </View>

    {resource?.error ? <Card><Eyebrow>History unavailable</Eyebrow><Body muted>Your current scores are available, but history could not be loaded. It has not been reset.</Body><PrimaryButton label="Retry history" secondary onPress={() => void reload()} /></Card> : null}
    {history ? <ProgressHistoryCard history={history} showUpgrade={history.access === "limited" && !isPro}
      onUpgrade={() => openPaywall("progress_history", "progress_history")} /> : null}

    {nextSkill && nextSkillSlug ? <Card style={{ borderColor: "rgba(0,229,255,.28)" }}>
      <Eyebrow>Practice focus</Eyebrow>
      <Title size={24}>Sharpen {nextSkill.name}</Title>
      <Body muted>{needsProForFocusedPractice
        ? "Your daily core training remains free. Cogni Pro unlocks additional focused rounds on a skill you choose to practise."
        : "This is one of your lower measured scores. Use it as a possible focus for your next practice."}</Body>
      <PrimaryButton label={needsProForFocusedPractice ? `Unlock practice for ${nextSkill.name}` : `Practise ${nextSkill.name}`} onPress={() => openFocusedPractice(nextSkillSlug, "progress_next_move")} />
    </Card> : null}

    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Eyebrow>Skill profile</Eyebrow>
        <Text style={{ color: colors.soft, fontSize: 13, fontWeight: "800" }}>{measured.length} active</Text>
      </View>
      {measured.length
        ? [...measured].sort((a, b) => Number(a.score) - Number(b.score)).map((row) => <SkillBar key={row.skill_id} label={relation(row.skills)?.name ?? "Skill"} score={Number(row.score)} reliability={Number(row.reliability)} />)
        : <Body muted>Complete your starting check to begin tracking your skill progress.</Body>}
    </Card>
    <ToolkitShortcut />
    <ScoreExplainer />
  </Screen>;
}
