import React, { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { ScrollView, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { apiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";
import type { TodayResponse } from "@/lib/types";
import { Body, Card, Eyebrow, ErrorState, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";

export default function LessonScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [today, setToday] = useState<TodayResponse | null>(null); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [thought, setThought] = useState(""); const [revealed, setRevealed] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setToday(await apiFetch<TodayResponse>("/api/mobile/today")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load today’s insight."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState />; if (error && !today) return <ErrorState message={error} onRetry={() => void load()} />; if (today?.state === "onboarding") return <Redirect href="/onboarding" />; if (today?.state === "diagnostic" || today?.state === "training") return <Redirect href="/(tabs)/train/session" />; if (today?.state === "complete") return <Redirect href="/(tabs)/train" />; if (today?.state !== "lesson" || !today.lesson) return <ErrorState message="Today’s insight isn’t available right now." onRetry={() => void load()} />;
  const lesson = today.lesson;
  async function complete() { setBusy(true); setError(""); try { await apiFetch<{ ok: boolean; xpEarned: number }>("/api/mobile/lesson/complete", { method: "POST", body: JSON.stringify({ lessonId: lesson.id }) }); router.replace("/(tabs)/train/session"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not finish this insight."); } finally { setBusy(false); } }
  function keepEntryVisible() { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300); }
  return <Screen ref={scrollRef} contentStyle={{ paddingBottom: 180 }}>
    <LinearGradient colors={["rgba(35,44,105,.96)", "rgba(13,19,49,.99)"]} style={{ borderRadius: 26, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 8 }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><CogniMark size={28} animated={false} /><Eyebrow>{today.modeLabel ?? "Today’s insight"}</Eyebrow></View><Text style={{ color: colors.muted, fontWeight: "800" }}>{lesson.estimated_minutes} min</Text></View><Title size={29}>{lesson.emoji} {lesson.title}</Title><Body muted>{lesson.subtitle}</Body></LinearGradient>
    {lesson.scenario_context ? <Card style={{ borderColor: "rgba(0,229,255,.22)" }}><Eyebrow>Situation</Eyebrow><Body>{lesson.scenario_context}</Body></Card> : null}
    <Card><Eyebrow>The story</Eyebrow><Body>{lesson.content.story}</Body></Card>
    <Card><Eyebrow>The twist</Eyebrow><Body>{lesson.content.twist}</Body></Card>
    <Card style={{ borderColor: "rgba(107,92,255,.44)" }}><Eyebrow>Key idea</Eyebrow><Body>{lesson.content.principle}</Body></Card>
    <Card style={{ borderColor: "rgba(255,79,216,.30)" }}><Eyebrow>Your turn</Eyebrow><Title size={25}>What do you think?</Title><Body>{lesson.content.try_it}</Body><TextInput multiline value={thought} onChangeText={setThought} onFocus={keepEntryVisible} placeholder="Write one sentence. This stays on your device and isn’t graded." placeholderTextColor={colors.soft} style={{ minHeight: 126, textAlignVertical: "top", borderRadius: 17, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: "rgba(14,21,52,.96)", color: colors.text, padding: 14, fontSize: 16.5, lineHeight: 24 }} />{!revealed ? <PrimaryButton label="Reveal the thinking move" disabled={thought.trim().length < 3} onPress={() => setRevealed(true)} /> : null}</Card>
    {revealed ? <><Card style={{ borderColor: "rgba(34,211,164,.48)" }}><Eyebrow>The reveal</Eyebrow><Title size={23}>The thinking move</Title><Body>{lesson.content.reveal}</Body></Card><Card><Eyebrow>Why this matters with AI</Eyebrow><Body>{lesson.content.ai_age}</Body></Card>{error ? <Text selectable style={{ color: "#ff9ac0" }}>{error}</Text> : null}<PrimaryButton label={busy ? "Saving…" : "Complete insight +5 XP"} disabled={busy} onPress={() => void complete()} /></> : null}
  </Screen>;
}
