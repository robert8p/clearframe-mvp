import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { useProGate } from "@/lib/pro-gate";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, MetricCard, PrimaryButton, ProgressRing, Screen, SkillBar, Title } from "@/components/ui";
function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }

type ProgressHistory = {
  access: "full" | "limited";
  freeDays: number;
  windowDays: number;
  points: { date: string; skillId: string; skillSlug: string | null; skillName: string; score: number; reliability: number; attempts: number }[];
};

type Trend = { skillId: string; skillName: string; from: number; to: number; delta: number; observations: number };

function trendRows(history: ProgressHistory | null): Trend[] {
  if (!history) return [];
  const grouped = new Map<string, ProgressHistory["points"]>();
  for (const point of history.points) grouped.set(point.skillId, [...(grouped.get(point.skillId) ?? []), point]);
  return [...grouped.entries()].map(([skillId, points]) => {
    const first = points[0]; const last = points[points.length - 1];
    return { skillId, skillName: last.skillName, from: first.score, to: last.score, delta: Math.round((last.score - first.score) * 10) / 10, observations: points.length };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 6);
}

export default function ProgressScreen() {
  const [data, setData] = useState<MobileProfileResponse | null>(null); const [history, setHistory] = useState<ProgressHistory | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const { needsProForFocusedPractice, isPro, openFocusedPractice, openPaywall } = useProGate();
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [profile, progressHistory] = await Promise.all([
        apiFetch<MobileProfileResponse>("/api/mobile/profile"),
        apiFetch<ProgressHistory>("/api/mobile/progress-history").catch(() => null),
      ]);
      setData(profile); setHistory(progressHistory);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load progress."); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const trends = useMemo(() => trendRows(history), [history]);
  if (loading) return <LoadingState />; if (error || !data) return <ErrorState message={error || "Could not load progress."} onRetry={() => void load()} />;
  const average = data.summary.averageScore == null ? 0 : Math.round(data.summary.averageScore * 100); const measured = data.skillScores.filter((row) => row.attempts > 0); const strongest = [...measured].sort((a,b) => Number(b.score)-Number(a.score))[0];
  const next = [...measured].sort((a,b) => Number(a.score)-Number(b.score))[0]; const nextSkill = next ? relation(next.skills) : null; const nextSkillSlug = nextSkill?.slug;
  return <Screen>
    <View style={{ gap: 5 }}><Eyebrow>Your progress</Eyebrow><Title>See what’s changing</Title><Body muted>Cogni updates your skill profile from the evidence you create. Treat the score and the evidence level together rather than as a fixed grade.</Body></View>
    <LinearGradient colors={["rgba(30,43,99,.97)", "rgba(12,18,45,.98)"]} style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, flexDirection: "row", alignItems: "center", gap: 16 }}><ProgressRing value={average} label="recent" /><View style={{ flex: 1, gap: 6 }}><Eyebrow>Recent performance</Eyebrow><Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "900" }}>{average ? "Your profile is taking shape" : "Evidence is just beginning"}</Text><Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{measured.length} measured skills · {data.summary.answers} answers</Text></View></LinearGradient>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}><View style={{ flexGrow: 1, flexBasis: 150 }}><MetricCard label="XP" value={data.profile.xp ?? 0} hint="total earned" /></View><View style={{ flexGrow: 1, flexBasis: 150 }}><MetricCard label="Streak" value={`${data.profile.current_streak ?? 0}d`} hint="current run" /></View></View>
    <Card style={{ borderColor: "rgba(107,92,255,.38)" }}><Eyebrow>How to read this</Eyebrow><Title size={23}>Score + evidence, together</Title><Body muted>Your Development Score reflects performance in the questions Cogni has seen so far. The evidence label tells you how much observation sits behind that score.</Body><Body muted style={{ fontSize: 14, lineHeight: 20 }}>Neither is a population percentile or a permanent grade. Early movement should be treated as a signal to keep learning, not a verdict on ability.</Body></Card>
    {history ? <Card style={{ borderColor: history.access === "full" ? "rgba(0,229,255,.34)" : colors.line }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Eyebrow>{history.access === "full" ? "Cogni Pro history" : "Recent trend"}</Eyebrow><Text style={{ color: colors.soft, fontSize: 12.5, fontWeight: "800" }}>{history.windowDays} days</Text></View><Title size={23}>{trends.length ? "How your skills are moving" : "More history will appear here"}</Title><Body muted>{history.access === "full" ? "Your full available skill-change history is included, capped to the last year for a responsive mobile view." : `Free includes the most recent ${history.freeDays} days of skill movement. Cogni Pro unlocks the full available history.`}</Body>{trends.map((trend) => <View accessible accessibilityLabel={`${trend.skillName}. Changed ${trend.delta >= 0 ? "up" : "down"} ${Math.abs(trend.delta)} points from ${trend.from} to ${trend.to}.`} key={trend.skillId} style={{ minHeight: 52, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{trend.skillName}</Text><Text style={{ color: colors.soft, fontSize: 12.5 }}>{trend.observations} daily observations</Text></View><Text style={{ color: trend.delta >= 0 ? colors.green : colors.muted, fontSize: 16, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{trend.delta > 0 ? "+" : ""}{trend.delta}</Text></View>)}{history.access === "limited" && !isPro ? <PrimaryButton label="Unlock full progress history" onPress={() => openPaywall("progress_history", "progress_history")} /> : null}</Card> : null}
    {strongest ? <Card style={{ borderColor: "rgba(0,229,255,.34)" }}><Eyebrow>Emerging strength</Eyebrow><Title size={24}>{relation(strongest.skills)?.name ?? "Skill"}</Title><Body muted>This is currently one of your stronger measured areas. The evidence label shows how much history sits behind the score.</Body><SkillBar label={relation(strongest.skills)?.name ?? "Skill"} score={Number(strongest.score)} reliability={Number(strongest.reliability)} /></Card> : null}
    {nextSkill && nextSkillSlug ? <Card style={{ borderColor: "rgba(0,229,255,.28)" }}><Eyebrow>Next best move</Eyebrow><Title size={24}>Sharpen {nextSkill.name}</Title><Body muted>{needsProForFocusedPractice ? "Your daily core training remains free. Cogni Pro unlocks additional focused rounds on the skill with the clearest upside." : "This is currently your lowest measured skill. A focused round gives Cogni more evidence while practising the area with the clearest upside."}</Body><PrimaryButton label={needsProForFocusedPractice ? `Unlock practice for ${nextSkill.name}` : `Practise ${nextSkill.name}`} onPress={() => openFocusedPractice(nextSkillSlug, "progress_next_move")} /></Card> : null}
    <Card><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}><Eyebrow>Skill profile</Eyebrow><Text style={{ color: colors.soft, fontSize: 13, fontWeight: "800" }}>{measured.length} active</Text></View>{measured.length ? [...measured].sort((a,b) => Number(a.score)-Number(b.score)).map((row) => <SkillBar key={row.skill_id} label={relation(row.skills)?.name ?? "Skill"} score={Number(row.score)} reliability={Number(row.reliability)} />) : <Body muted>Complete your starting check to begin tracking skill movement.</Body>}</Card>
  </Screen>;
}
