import React, { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusLabel } from "@/components/interaction-cues";
import { apiFetch } from "@/lib/api";
import { useProGate } from "@/lib/pro-gate";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { ActionLink, Body, Card, Eyebrow, ErrorState, LoadingState, ProgressBar, Screen, Title } from "@/components/ui";
function relation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }
function evidence(value: number) { return value >= .7 ? "Strong evidence" : value >= .35 ? "Building evidence" : "Early evidence"; }

export default function SkillsScreen() {
  const [data, setData] = useState<MobileProfileResponse | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const { needsProForFocusedPractice, isPro, openFocusedPractice } = useProGate();
  const load = useCallback(async () => { setLoading(true); setError(""); try { setData(await apiFetch<MobileProfileResponse>("/api/mobile/profile")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load skills."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />; if (error || !data) return <ErrorState message={error || "Could not load skills."} onRetry={() => void load()} />; if (!data.profile.audience_segment) return <Redirect href="/onboarding" />;
  const sorted = [...data.skillScores].sort((a,b) => Number(a.score)-Number(b.score));
  return <Screen>
    <View style={{ gap: 5 }}><Eyebrow>Explore your skill map</Eyebrow><Title>Skills</Title><Body muted>{needsProForFocusedPractice ? "Your skill map stays free. Cogni Pro unlocks unlimited focused practice on any skill." : "Choose any skill for a focused practice round. Scores show performance so far; evidence tells you how much confidence to place in them."}</Body></View>
    <LinearGradient colors={["rgba(25,37,86,.94)", "rgba(12,18,45,.98)"]} style={{ borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><View style={{ gap: 4 }}><Eyebrow>Your map</Eyebrow><Text style={{ color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: "900" }}>{sorted.length} skills tracked</Text></View><StatusLabel accent>{isPro ? "Cogni Pro" : "Adaptive selection"}</StatusLabel></View>
      <Body muted style={{ fontSize: 14, lineHeight: 20 }}>Lower scores are not failures. They identify where another short practice round may create the most value.</Body>
    </LinearGradient>
    <View style={{ gap: 11 }}>{sorted.length ? sorted.map((row) => { const skill = relation(row.skills); const slug = skill?.slug; const skillName = skill?.name ?? "Skill"; const evidenceLabel = evidence(Number(row.reliability)); return <Pressable accessibilityRole="button" accessibilityLabel={`${skillName}. Score ${Math.round(Number(row.score))} out of 100. ${evidenceLabel}. ${row.attempts} observations.${needsProForFocusedPractice ? " Cogni Pro focused practice." : ""}`} accessibilityHint={needsProForFocusedPractice ? "Opens Cogni Pro options" : "Opens a focused practice round"} key={row.skill_id} disabled={!slug} onPress={() => slug && openFocusedPractice(slug, "skills_map")} style={({ pressed }) => ({ opacity: pressed ? .80 : 1 })}><Card style={{ borderColor: colors.lineStrong }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: "900" }}>{skillName}</Text><Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 19 }}>{evidenceLabel} · {row.attempts} observations</Text></View><View style={{ alignItems: "flex-end", gap: 2 }}><Text style={{ color: colors.cyan, fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(Number(row.score))}</Text><Text style={{ color: colors.purple, fontSize: 13, lineHeight: 18, fontWeight: "900" }}>{needsProForFocusedPractice ? "Pro practise →" : "Practise →"}</Text></View></View><ProgressBar value={Number(row.score)} />{skill?.description ? <Body muted style={{ fontSize: 14, lineHeight: 20 }}>{skill.description}</Body> : null}</Card></Pressable>; }) : <Card><Title size={24}>Your profile is just beginning.</Title><Body muted>Complete the starting check to create your first skill scores.</Body><ActionLink label="Go to Train" hint="Open the training tab" onPress={() => router.push("/(tabs)/train")} /></Card>}</View>
  </Screen>;
}
