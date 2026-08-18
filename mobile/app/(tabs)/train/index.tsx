import React, { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniOrb } from "@/components/orb";
import { Body, Card, Eyebrow, ErrorState, LoadingState, PrimaryButton, ProgressBar, Screen, Title } from "@/components/ui";
import { apiFetch, todayApiPath } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { TodayResponse } from "@/lib/types";

function Hero({ eyebrow, title, body, cta, onPress, progress }: { eyebrow: string; title: string; body: string; cta: string; onPress: () => void; progress?: number }) {
  return (
    <LinearGradient colors={["rgba(31,43,103,.99)", "rgba(12,18,47,.995)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, borderCurve: "continuous", borderWidth: 1, borderColor: "rgba(83,105,165,.68)", padding: 19, overflow: "hidden", gap: 13, boxShadow: "0 14px 38px rgba(0,0,0,.22)" }}>
      <LinearGradient pointerEvents="none" colors={["rgba(0,229,255,.76)", "rgba(107,92,255,.46)", "rgba(255,79,216,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2 }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 7 }}><Eyebrow>{eyebrow}</Eyebrow><Title size={28}>{title}</Title><Body muted style={{ fontSize: 15, lineHeight: 22 }}>{body}</Body></View>
        <View accessible={false} style={{ marginRight: -8 }}><CogniOrb size={76} /></View>
      </View>
      {typeof progress === "number" ? <View style={{ gap: 7 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: "700" }}>Session progress</Text><Text style={{ color: colors.cyan, fontWeight: "900", fontSize: 12.5, fontVariant: ["tabular-nums"] }}>{Math.round(progress)}%</Text></View><ProgressBar value={progress} /></View> : null}
      <PrimaryButton label={cta} onPress={onPress} />
    </LinearGradient>
  );
}

export default function TrainHomeScreen() {
  const [today, setToday] = useState<TodayResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError("");
    try { setToday(await apiFetch<TodayResponse>(todayApiPath())); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load training."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Choosing today’s training…" />; if (error && !today) return <ErrorState message={error} onRetry={() => void load()} />; if (today?.state === "onboarding") return <Redirect href="/onboarding" />;
  const questionCount = today?.state === "diagnostic" ? today.challenges?.length ?? 12 : today?.session?.challenges?.length ?? 0;
  if (today?.state === "lesson") return <Screen refreshing={refreshing} onRefresh={() => void load(true)}><Hero eyebrow={today.modeLabel ?? "Today’s insight"} title={today.lesson?.title ?? "Your short insight is ready"} body={today.lesson?.subtitle ?? "One short idea before today’s decisions."} cta="Open insight" onPress={() => router.push("/(tabs)/train/lesson")} />{today.lesson?.scenario_context ? <Card><Eyebrow>{today.situationLabel ?? "Situation"}</Eyebrow><Body>{today.lesson.scenario_context}</Body></Card> : null}{error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger }}>{error}</Text> : null}</Screen>;
  if (today?.state === "diagnostic") { const answered = today.answeredChallengeIds?.length ?? 0; const progress = questionCount ? answered / questionCount * 100 : 0; return <Screen refreshing={refreshing} onRefresh={() => void load(true)}><Hero eyebrow="Starting check" title="Find your best starting point" body={`${questionCount} short decisions across evidence, reasoning, AI verification, bias and uncertainty.`} cta={answered ? "Continue starting check" : "Start your check"} onPress={() => router.push("/(tabs)/train/session")} progress={progress} /><Card><Eyebrow>Why this comes first</Eyebrow><Body>Cogni uses a shared core plus situations relevant to your context so your scores stay comparable while the experience feels useful.</Body></Card></Screen>; }
  if (today?.state === "training") { const answered = today.session?.answeredChallengeIds?.length ?? 0; const progress = questionCount ? answered / questionCount * 100 : 0; return <Screen refreshing={refreshing} onRefresh={() => void load(true)}><Hero eyebrow={today.modeLabel ?? "Today’s training"} title={answered ? "Keep the momentum going" : "Your decisions are ready"} body={answered ? `${answered} of ${questionCount} questions complete.` : `${questionCount} situations chosen around the skills that will give you the most value today.`} cta={answered ? "Continue training" : "Train now"} onPress={() => router.push("/(tabs)/train/session")} progress={progress} /></Screen>; }
  if (today?.state === "complete") return <Screen refreshing={refreshing} onRefresh={() => void load(true)}><Hero eyebrow="Daily goal complete" title="Judgement strengthened" body="Today’s core session is done. Training stays open whenever you want another focused round." cta="Choose a skill to practise" onPress={() => router.push("/(tabs)/skills")} progress={100} /><Card><Eyebrow>Keep building</Eyebrow><Body>Pick the skill you want to work on next. Cogni will prefer questions you haven’t seen before.</Body></Card></Screen>;
  return <Screen refreshing={refreshing} onRefresh={() => void load(true)}><Card><Eyebrow>Today’s training</Eyebrow><Title size={27}>Not ready yet</Title><Body muted>{today?.message ?? "Cogni couldn’t prepare a suitable set right now."}</Body><PrimaryButton label="Try again" onPress={() => void load(true)} /></Card></Screen>;
}
