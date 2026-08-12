import React, { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, MetricCard, ProgressRing, Screen, SkillBar, Title } from "@/components/ui";
function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }

export default function ProgressScreen() {
  const [data, setData] = useState<MobileProfileResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await apiFetch<MobileProfileResponse>("/api/mobile/profile")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load progress."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />; if (error || !data) return <ErrorState message={error || "Could not load progress."} onRetry={() => void load()} />;
  const average = data.summary.averageScore == null ? 0 : Math.round(data.summary.averageScore * 100); const measured = data.skillScores.filter((row) => row.attempts > 0); const strongest = [...measured].sort((a,b) => Number(b.score)-Number(a.score))[0];
  return <Screen>
    <View style={{ gap: 5 }}><Eyebrow>Your progress</Eyebrow><Title>See what’s changing</Title><Body muted>Cogni updates your skill profile from the evidence you create. Treat the score and the evidence level together rather than as a fixed grade.</Body></View>
    <LinearGradient colors={["rgba(30,43,99,.97)", "rgba(12,18,45,.98)"]} style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, flexDirection: "row", alignItems: "center", gap: 16 }}><ProgressRing value={average} label="recent" /><View style={{ flex: 1, gap: 6 }}><Eyebrow>Recent performance</Eyebrow><Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "900" }}>{average ? "Your profile is taking shape" : "Evidence is just beginning"}</Text><Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{measured.length} measured skills · {data.summary.answers} answers</Text></View></LinearGradient>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}><View style={{ flexGrow: 1, flexBasis: 150 }}><MetricCard label="XP" value={data.profile.xp ?? 0} hint="total earned" /></View><View style={{ flexGrow: 1, flexBasis: 150 }}><MetricCard label="Streak" value={`${data.profile.current_streak ?? 0}d`} hint="current run" /></View></View>
    {strongest ? <Card style={{ borderColor: "rgba(0,229,255,.34)" }}><Eyebrow>Emerging strength</Eyebrow><Title size={24}>{relation(strongest.skills)?.name ?? "Skill"}</Title><Body muted>This is currently one of your stronger measured areas. The evidence label shows how much history sits behind the score.</Body><SkillBar label={relation(strongest.skills)?.name ?? "Skill"} score={Number(strongest.score)} reliability={Number(strongest.reliability)} /></Card> : null}
    <Card><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}><Eyebrow>Skill profile</Eyebrow><Text style={{ color: colors.soft, fontSize: 13, fontWeight: "800" }}>{measured.length} active</Text></View>{measured.length ? [...measured].sort((a,b) => Number(a.score)-Number(b.score)).map((row) => <SkillBar key={row.skill_id} label={relation(row.skills)?.name ?? "Skill"} score={Number(row.score)} reliability={Number(row.reliability)} />) : <Body muted>Complete your starting check to begin tracking skill movement.</Body>}</Card>
  </Screen>;
}
