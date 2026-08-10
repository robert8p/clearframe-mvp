import React, { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, Screen, SkillBar, Title } from "@/components/ui";
function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }

export default function ProgressScreen() {
  const [data, setData] = useState<MobileProfileResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await apiFetch<MobileProfileResponse>("/api/mobile/profile")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load progress."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />; if (error || !data) return <ErrorState message={error || "Could not load progress."} onRetry={() => void load()} />;
  const average = data.summary.averageScore == null ? null : Math.round(data.summary.averageScore * 100); const measured = data.skillScores.filter((row) => row.attempts > 0); const strongest = [...measured].sort((a,b) => Number(b.score)-Number(a.score))[0];
  return <Screen><Eyebrow>Your progress</Eyebrow><Title>See what’s changing</Title><Body muted>Cogni updates your skill profile from the answers you give. Scores can move both ways as the evidence improves.</Body><View style={{ flexDirection: "row", gap: 10 }}><Card style={{ flex: 1 }}><Eyebrow>Answers</Eyebrow><Text style={{ color: colors.text, fontSize: 30, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{data.summary.answers}</Text></Card><Card style={{ flex: 1 }}><Eyebrow>Recent score</Eyebrow><Text style={{ color: colors.text, fontSize: 30, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{average == null ? "—" : `${average}%`}</Text></Card></View>{strongest ? <Card><Eyebrow>Emerging strength</Eyebrow><Title size={24}>{relation(strongest.skills)?.name ?? "Skill"}</Title><Body muted>This is currently one of your stronger measured areas. The evidence level matters as much as the score.</Body><SkillBar label={relation(strongest.skills)?.name ?? "Skill"} score={Number(strongest.score)} reliability={Number(strongest.reliability)} /></Card> : null}<Card><Eyebrow>Skill profile</Eyebrow>{measured.length ? [...measured].sort((a,b) => Number(a.score)-Number(b.score)).map((row) => <SkillBar key={row.skill_id} label={relation(row.skills)?.name ?? "Skill"} score={Number(row.score)} reliability={Number(row.reliability)} />) : <Body muted>Complete your starting check to begin tracking skill movement.</Body>}</Card></Screen>;
}
