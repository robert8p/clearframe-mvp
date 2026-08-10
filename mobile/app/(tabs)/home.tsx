import React, { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse, TodayResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, Pill, PrimaryButton, Screen, SkillBar, Title } from "@/components/ui";
import { CogniOrb } from "@/components/orb";

const audienceNames: Record<string, string> = { university_student: "University", graduate_early_career: "Graduate / early career", junior_professional: "Junior professional", management: "Management", executive: "Executive" };
const audiencePromise: Record<string, string> = { university_student: "Build the thinking skills that improve study, AI use and graduate readiness.", graduate_early_career: "Build the judgement that makes people trust your work.", junior_professional: "Turn analysis into stronger recommendations and decisions.", management: "Make clearer decisions about people, priorities, resources and risk.", executive: "Sharpen strategic judgement under uncertainty." };
function skillRelation(value: MobileProfileResponse["skillScores"][number]["skills"]) { return Array.isArray(value) ? value[0] : value; }

export default function HomeScreen() {
  const [profile, setProfile] = useState<MobileProfileResponse | null>(null); const [today, setToday] = useState<TodayResponse | null>(null); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => { if (refresh) setRefreshing(true); else setLoading(true); setError(""); try { const [profileData, todayData] = await Promise.all([apiFetch<MobileProfileResponse>("/api/mobile/profile"), apiFetch<TodayResponse>("/api/mobile/today")]); setProfile(profileData); setToday(todayData); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load Cogni."); } finally { setLoading(false); setRefreshing(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Preparing Cogni…" />; if (error && !profile) return <ErrorState message={error} onRetry={() => void load()} />; if (!profile?.profile.audience_segment || today?.state === "onboarding") return <Redirect href="/onboarding" />;
  const firstName = profile.profile.full_name?.trim().split(/\s+/)[0] || "there"; const audience = profile.profile.audience_segment; const lowest = [...profile.skillScores].sort((a,b) => Number(a.score) - Number(b.score)).slice(0,3);
  const stateCopy: Record<string, { eyebrow: string; title: string; body: string; cta: string }> = {
    diagnostic: { eyebrow: "Your starting check", title: "Measure first. Train second.", body: "A short starting check helps Cogni find the skills worth focusing on first.", cta: "Continue starting check" },
    lesson: { eyebrow: "Today’s insight", title: "A fresh thinking move is ready.", body: "Start with one short idea, then put it to work in today’s decisions.", cta: "Start today’s insight" },
    training: { eyebrow: "Today’s training", title: "Your next decisions are ready.", body: "Cogni has selected situations around the skills that will give you the most value today.", cta: "Continue training" },
    complete: { eyebrow: "Daily goal complete", title: "Good work. Training stays open.", body: "Your daily session is done. Pick a skill if you want another short practice round.", cta: "Keep training" },
    unavailable: { eyebrow: "Today’s training", title: "Almost ready.", body: today?.message ?? "Cogni is preparing the next set.", cta: "Try again" },
  };
  const copy = stateCopy[today?.state ?? "unavailable"] ?? stateCopy.unavailable;
  function openTraining() { if (today?.state === "complete") router.push("/(tabs)/skills"); else if (today?.state === "unavailable") void load(true); else router.push("/(tabs)/train"); }
  return <Screen refreshing={refreshing} onRefresh={() => void load(true)}><View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Title size={34}>Hello, {firstName} 👋</Title><Body muted>{audiencePromise[audience] ?? "Build clearer judgement for the decisions you face."}</Body></View><View style={{ alignItems: "flex-end", gap: 8 }}><Pill accent>{audienceNames[audience] ?? audience}</Pill><Pill>🔥 {profile.profile.current_streak ?? 0} days</Pill></View></View><Card style={{ alignItems: "center", overflow: "hidden" }}><CogniOrb size={104} /><View style={{ alignSelf: "stretch", gap: 8 }}><Eyebrow>{copy.eyebrow}</Eyebrow><Title size={27}>{copy.title}</Title><Body muted>{copy.body}</Body><PrimaryButton label={copy.cta} onPress={openTraining} /></View></Card><View style={{ flexDirection: "row", gap: 10 }}><Card style={{ flex: 1 }}><Eyebrow>XP</Eyebrow><Text style={{ color: colors.text, fontSize: 28, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{profile.profile.xp ?? 0}</Text></Card><Card style={{ flex: 1 }}><Eyebrow>Answers</Eyebrow><Text style={{ color: colors.text, fontSize: 28, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{profile.summary.answers}</Text></Card></View>{lowest.length ? <Card><Eyebrow>Skills to work on next</Eyebrow>{lowest.map((row) => { const skill = skillRelation(row.skills); return <SkillBar key={row.skill_id} label={skill?.name ?? "Skill"} score={Number(row.score)} reliability={Number(row.reliability)} />; })}<PrimaryButton label="See all skills" secondary onPress={() => router.push("/(tabs)/skills")} /></Card> : <Card><Eyebrow>Your skill profile</Eyebrow><Body muted>Complete your starting check and Cogni will begin building your skill profile.</Body></Card>}{error ? <Text selectable style={{ color: "#ff9ac0" }}>{error}</Text> : null}</Screen>;
}
