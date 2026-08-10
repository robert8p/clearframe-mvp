import React, { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, ProgressBar, Screen, Title } from "@/components/ui";
function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }
function evidence(value: number) { return value >= .7 ? "Strong evidence" : value >= .35 ? "Building evidence" : "Early evidence"; }

export default function SkillsScreen() {
  const [data, setData] = useState<MobileProfileResponse | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await apiFetch<MobileProfileResponse>("/api/mobile/profile")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load skills."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />; if (error || !data) return <ErrorState message={error || "Could not load skills."} onRetry={() => void load()} />; if (!data.profile.audience_segment) return <Redirect href="/onboarding" />;
  return <Screen><Eyebrow>Your judgement profile</Eyebrow><Title>Skills</Title><Body muted>Skill score reflects what you’ve demonstrated so far. Evidence level grows as Cogni sees more answers.</Body><View style={{ gap: 10 }}>{data.skillScores.length ? [...data.skillScores].sort((a,b) => Number(a.score)-Number(b.score)).map((row) => { const skill = relation(row.skills); const slug = skill?.slug; return <Pressable key={row.skill_id} disabled={!slug} onPress={() => slug && router.push({ pathname: "/(tabs)/train/practice/[slug]", params: { slug } })} style={({ pressed }) => ({ opacity: pressed ? .8 : 1 })}><Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: "800" }}>{skill?.name ?? "Skill"}</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{evidence(Number(row.reliability))} · {row.attempts} observations</Text></View><View style={{ alignItems: "flex-end" }}><Text style={{ color: colors.cyan, fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(Number(row.score))}</Text><Text style={{ color: colors.purple, fontSize: 13, fontWeight: "800" }}>Practise →</Text></View></View><ProgressBar value={Number(row.score)} />{skill?.description ? <Body muted style={{ fontSize: 14, lineHeight: 20 }}>{skill.description}</Body> : null}</Card></Pressable>; }) : <Card><Title size={24}>Your profile is just beginning.</Title><Body muted>Complete the starting check to create your first skill scores.</Body><Pressable onPress={() => router.push("/(tabs)/train")}><Text style={{ color: colors.cyan, fontSize: 16, fontWeight: "800" }}>Go to Train →</Text></Pressable></Card>}</View></Screen>;
}
