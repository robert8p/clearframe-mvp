import React from "react";
import { useFocusResource } from "@/lib/use-focus-resource";
import { historyTrends } from "@/lib/learning-view";
import { RefreshNotice } from "@/components/learning-surfaces";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { useProGate } from "@/lib/pro-gate";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, MetricCard, PrimaryButton, ProgressRing, Screen, SkillBar, Title } from "@/components/ui";

function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) {
  return Array.isArray(value) ? value[0] : value;
}

type ProgressHistory = {
  access: "full" | "limited";
  freeDays: number;
  windowDays: number | null;
  availableFrom: string | null;
  availableTo: string | null;
  points: {
    date: string;
    skillId: string;
    skillSlug: string | null;
    skillName: string;
    score: number;
    reliability: number;
    attempts: number;
  }[];
};

function historyWindowLabel(history: ProgressHistory) {
  if (history.access === "full") return "All available";
  return `${history.windowDays ?? history.freeDays} days`;
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
  const trends = historyTrends(history?.points ?? []);
  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message={error || "Could not load progress."} onRetry={() => void reload()} />;

  const average = data.summary.averageScore == null ? null : Math.round(data.summary.averageScore * 100);
  const measured = data.skillScores.filter((row) => row.attempts > 0);
  const strongest = [...measured].sort((a, b) => Number(b.score) - Number(a.score))[0];
  const next = [...measured].sort((a, b) => Number(a.score) - Number(b.score))[0];
  const nextSkill = next ? relation(next.skills) : null;
  const nextSkillSlug = nextSkill?.slug;

  return <Screen refreshing={refreshing} onRefresh={() => void reload()}>
    {error ? <RefreshNotice message={error} onRetry={() => void reload()} /> : null}
    <View style={{ gap: 5 }}>
      <Eyebrow>Your progress</Eyebrow>
      <Title>See what’s changing</Title>
      <Body muted>Your answers help Cogni build your skill profile. Read each score alongside its evidence level, rather than as a fixed grade.</Body>
    </View>

    <LinearGradient colors={["rgba(30,43,99,.97)", "rgba(12,18,45,.98)"]} style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, flexDirection: fontScale>1.25 || width<360 ? "column" : "row", alignItems: "center", gap: 16 }}>
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

    <Card style={{ borderColor: "rgba(107,92,255,.38)" }}>
      <Eyebrow>How to read this</Eyebrow>
      <Title size={23}>Score + evidence, together</Title>
      <Body muted>Your Development Score reflects performance in the questions Cogni has seen so far. The evidence label tells you how much observation sits behind that score.</Body>
      <Body muted style={{ fontSize: 14, lineHeight: 20 }}>Neither is a population percentile or a permanent grade. Early movement should be treated as a signal to keep learning, not a verdict on ability.</Body>
    </Card>

    {resource?.error ? <Card><Eyebrow>History unavailable</Eyebrow><Body muted>Your current scores are available, but history could not be loaded. It has not been reset.</Body><PrimaryButton label="Retry history" secondary onPress={() => void reload()} /></Card> : null}
    {history ? <Card style={{ borderColor: history.access === "full" ? "rgba(0,229,255,.34)" : colors.line }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Eyebrow>{history.access === "full" ? "Skill history" : "Recent trend"}</Eyebrow>
        <Text style={{ color: colors.soft, fontSize: 12.5, fontWeight: "800" }}>{historyWindowLabel(history)}</Text>
      </View>
      <Title size={23}>{trends.length ? "How your skills are moving" : "Keep practising to see changes"}</Title>
      <Body muted>{history.access === "full"
        ? "Your complete available daily skill-change history is included."
        : `Free includes the most recent ${history.freeDays} days of skill movement. Cogni Pro unlocks the complete available history.`}</Body>
      {history.access === "full" && history.availableFrom && history.availableTo
        ? <Text style={{ color: colors.soft, fontSize: 12.5 }}>Available from {history.availableFrom} to {history.availableTo}</Text>
        : null}
      {trends.length ? <View accessible accessibilityLabel={`${trends[0].skillName}. Last ${Math.min(14,trends[0].points.length)} recorded days, from ${trends[0].points.slice(-14)[0].date} to ${trends[0].points.slice(-1)[0].date}. Scores ${trends[0].points.slice(-14).map(point=>point.score).join(", ")}.`} style={{gap:8}}><Body muted style={{fontSize:13}}>Recent recorded days · {trends[0].skillName}</Body><View accessible={false} style={{height:58,flexDirection:"row",alignItems:"flex-end",gap:5,borderBottomWidth:1,borderColor:colors.lineStrong}}>{trends[0].points.slice(-14).map(point=><View key={point.date} style={{flex:1,height:Math.max(0,Math.min(100,point.score))*0.56,backgroundColor:colors.cyan,borderTopLeftRadius:4,borderTopRightRadius:4}} />)}</View><Text style={{color:colors.soft,fontSize:12,lineHeight:18}}>0–100 score scale. Each bar is a recorded day; gaps between dates are not shown.</Text></View> : null}
      {trends.map((trend) => <View
        accessible
        accessibilityLabel={`${trend.skillName}. Changed ${trend.delta >= 0 ? "up" : "down"} ${Math.abs(trend.delta)} points from ${trend.from} to ${trend.to}.`}
        key={trend.skillId}
        style={{ minHeight: 52, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{trend.skillName}</Text>
          <Text style={{ color: colors.soft, fontSize: 12.5 }}>{trend.observations} daily observations</Text>
        </View>
        <Text style={{ color: trend.delta >= 0 ? colors.green : colors.muted, fontSize: 16, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{trend.delta > 0 ? "+" : ""}{trend.delta}</Text>
      </View>)}
      {history.access === "limited" && !isPro ? <PrimaryButton label="Unlock full progress history" onPress={() => openPaywall("progress_history", "progress_history")} /> : null}
    </Card> : null}

    {strongest ? <Card style={{ borderColor: "rgba(0,229,255,.34)" }}>
      <Eyebrow>Emerging strength</Eyebrow>
      <Title size={24}>{relation(strongest.skills)?.name ?? "Skill"}</Title>
      <Body muted>This is currently one of your stronger measured areas. The evidence label shows how much history sits behind the score.</Body>
      <SkillBar label={relation(strongest.skills)?.name ?? "Skill"} score={Number(strongest.score)} reliability={Number(strongest.reliability)} />
    </Card> : null}

    {nextSkill && nextSkillSlug ? <Card style={{ borderColor: "rgba(0,229,255,.28)" }}>
      <Eyebrow>Next best move</Eyebrow>
      <Title size={24}>Sharpen {nextSkill.name}</Title>
      <Body muted>{needsProForFocusedPractice
        ? "Your daily core training remains free. Cogni Pro unlocks additional focused rounds on a skill you choose to practise."
        : "This is one of your lower measured scores. It is a possible focus—not a proven weakness or a guarantee of improvement."}</Body>
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
  </Screen>;
}
