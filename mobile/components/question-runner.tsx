import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { apiFetch } from "@/lib/api";
import { useReducedMotion } from "@/lib/accessibility";
import { useFeedback } from "@/lib/feedback";
import { colors } from "@/lib/theme";
import type { AnswerResult, Challenge } from "@/lib/types";
import { Body, Card, Eyebrow, PrimaryButton, ProgressBar, Screen, Title } from "@/components/ui";

type Mode = "diagnostic" | "training" | "practice";
type Category = { id: string; label: string };
type Props = { mode: Mode; sessionId: string; challenges: Challenge[]; answeredChallengeIds?: string[]; modeLabel?: string; onComplete: () => void | Promise<void> };
const formatLabels: Record<string, string> = { single_choice: "Choose one", multi_select: "Choose all that apply", ranking: "Put in order", classification: "Sort into groups", triage: "What would you do?" };
function correctArray(value: unknown) { return Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : []; }
function correctMap(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {}; }
function difficulty(value: number) { if (value < 40) return "Intro"; if (value < 60) return "Standard"; if (value < 75) return "Challenge"; return "Advanced"; }

function Choice({ label, selected, correct, wrong, onPress, disabled, prefix }: { label: string; selected?: boolean; correct?: boolean; wrong?: boolean; onPress: () => void; disabled?: boolean; prefix?: string }) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion || (!correct && !wrong)) {
      scale.stopAnimation();
      scale.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.spring(scale, { toValue: correct ? 1.025 : .99, damping: 11, stiffness: 240, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 13, stiffness: 220, useNativeDriver: true }),
    ]).start();
  }, [correct, reducedMotion, scale, wrong]);

  const border = correct ? colors.green : wrong ? colors.pink : selected ? colors.violet : colors.lineStrong;
  const background = correct ? "rgba(34,211,164,0.13)" : wrong ? "rgba(236,72,153,0.10)" : selected ? "rgba(107,92,255,0.17)" : "rgba(16,23,53,.94)";
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 60, borderWidth: 1, borderColor: border, backgroundColor: background, borderRadius: 19, borderCurve: "continuous", padding: 14, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.80 : 1 })}>{prefix ? <LinearGradient colors={selected || correct ? ["rgba(0,229,255,.18)", "rgba(107,92,255,.24)"] : ["rgba(27,38,80,.9)", "rgba(19,27,59,.9)"]} style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" }}><Text style={{ color: correct ? colors.green : colors.muted, fontSize: 14, fontWeight: "900" }}>{prefix}</Text></LinearGradient> : null}<Text style={{ flex: 1, color: colors.text, fontSize: 16.5, lineHeight: 23, fontWeight: "800" }}>{label}</Text>{correct ? <Text accessibilityLabel="Correct" style={{ color: colors.green, fontSize: 20, fontWeight: "900" }}>✓</Text> : wrong ? <Text accessibilityLabel="Incorrect" style={{ color: colors.danger, fontSize: 18, fontWeight: "900" }}>×</Text> : null}</Pressable></Animated.View>;
}

export function QuestionRunner({ mode, sessionId, challenges, answeredChallengeIds = [], modeLabel, onComplete }: Props) {
  const { playFeedback } = useFeedback();
  const initialAnswered = useMemo(() => new Set(answeredChallengeIds), [answeredChallengeIds]);
  const firstPending = Math.max(0, challenges.findIndex((item) => !initialAnswered.has(item.id)));
  const [index, setIndex] = useState(firstPending);
  const [answered, setAnswered] = useState(new Set(answeredChallengeIds));
  const [selected, setSelected] = useState<number | null>(null);
  const [multi, setMulti] = useState<number[]>([]);
  const [ranking, setRanking] = useState<number[]>([]);
  const [classification, setClassification] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState(60);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const resultCueChallengeRef = useRef<string | null>(null);
  const challenge = challenges[index];
  const type = challenge?.interaction_type ?? "single_choice";
  const categories = ((challenge?.interaction_config?.categories ?? []) as Category[]).filter((item) => item?.id && item?.label);
  const requiredSelectionsRaw = Number(challenge?.interaction_config?.requiredSelections ?? challenge?.interaction_config?.required_selections ?? 0);
  const requiredSelections = Number.isInteger(requiredSelectionsRaw) && requiredSelectionsRaw > 0 ? requiredSelectionsRaw : null;
  const correctList = correctArray(result?.correctAnswer);
  const correctGroups = correctMap(result?.correctAnswer);
  const progress = challenges.length ? answered.size / challenges.length * 100 : 0;

  useEffect(() => { setStartedAt(Date.now()); }, [index]);
  useEffect(() => {
    if (!result || !challenge || resultCueChallengeRef.current === challenge.id) return;
    resultCueChallengeRef.current = challenge.id;
    const score = result.scoreFraction ?? (result.correct ? 1 : 0);
    const verdict = result.correct ? "Correct." : score >= .5 ? "Partly right." : "Worth reviewing.";
    AccessibilityInfo.announceForAccessibility(`${verdict} You earned ${result.xpEarned} XP.`);
    playFeedback(result.correct ? "correct" : score >= .5 ? "review" : "incorrect");
  }, [challenge, playFeedback, result]);

  if (!challenge) return <Screen><Card><Title size={24}>No questions available</Title><Body muted>Return to Train and try again.</Body><PrimaryButton label="Done" onPress={() => { playFeedback("complete"); void onComplete(); }} /></Card></Screen>;

  const multiReady = requiredSelections ? multi.length === requiredSelections : multi.length > 0;
  const ready = type === "multi_select" ? multiReady : type === "ranking" ? ranking.length === challenge.options.length : type === "classification" ? challenge.options.length > 0 && challenge.options.every((_item, optionIndex) => Boolean(classification[String(optionIndex)])) : selected !== null;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true); setError("");
    const responsePayload = type === "multi_select" ? multi : type === "ranking" ? ranking : type === "classification" ? classification : selected;
    try {
      const response = await apiFetch<AnswerResult>("/api/mobile/answer", { method: "POST", body: JSON.stringify({ challengeId: challenge.id, selectedIndex: type === "single_choice" || type === "triage" ? selected : undefined, responsePayload, confidence, responseTimeMs: Math.max(0, Date.now() - startedAt), mode, sessionId }) });
      setResult(response); setAnswered((current) => new Set([...current, challenge.id]));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not submit your answer."); }
    finally { setBusy(false); }
  }

  async function next() {
    const completed = new Set([...answered, challenge.id]);
    const nextIndex = challenges.findIndex((candidate, candidateIndex) => candidateIndex > index && !completed.has(candidate.id));
    if (nextIndex < 0) { playFeedback("complete"); await onComplete(); return; }
    setIndex(nextIndex); setSelected(null); setMulti([]); setRanking([]); setClassification({}); setConfidence(60); setResult(null); setError(""); setStartedAt(Date.now());
  }

  function choose(action: () => void) {
    action();
    playFeedback("selection");
  }

  function renderAnswers() {
    if (type === "multi_select") return <View style={{ gap: 10 }}>
      {requiredSelections && !result ? <Text accessibilityLiveRegion="polite" style={{ color: multi.length === requiredSelections ? colors.green : colors.muted, fontSize: 13.5, lineHeight: 20, fontWeight: "800" }}>Choose exactly {requiredSelections} · {multi.length}/{requiredSelections} selected</Text> : null}
      {challenge.options.map((option, optionIndex) => {
        const active = multi.includes(optionIndex), right = Boolean(result) && correctList.includes(optionIndex), wrong = Boolean(result) && active && !right;
        return <Choice key={optionIndex} label={option} selected={active} correct={right} wrong={wrong} disabled={Boolean(result)} prefix={active ? "✓" : ""} onPress={() => {
          if (!active && requiredSelections && multi.length >= requiredSelections) return;
          choose(() => setMulti((current) => current.includes(optionIndex) ? current.filter((value) => value !== optionIndex) : [...current, optionIndex]));
        }} />;
      })}
    </View>;
    if (type === "ranking") {
      const remaining = challenge.options.map((option, optionIndex) => ({ option, optionIndex })).filter((item) => !ranking.includes(item.optionIndex));
      return <View style={{ gap: 10 }}>{ranking.map((optionIndex, rankIndex) => <Choice key={`rank-${optionIndex}`} label={challenge.options[optionIndex]} prefix={String(rankIndex + 1)} disabled={Boolean(result)} onPress={() => choose(() => setRanking((current) => current.filter((value) => value !== optionIndex)))} />)}{!result ? remaining.map(({ option, optionIndex }) => <Choice key={optionIndex} label={option} prefix="+" onPress={() => choose(() => setRanking((current) => [...current, optionIndex]))} />) : null}{result ? <Card><Eyebrow>Best order</Eyebrow>{correctList.map((optionIndex, rankIndex) => <Body key={`${optionIndex}-${rankIndex}`}>{rankIndex + 1}. {challenge.options[optionIndex]}</Body>)}</Card> : null}</View>;
    }
    if (type === "classification") return <View style={{ gap: 10 }}>{challenge.options.map((option, optionIndex) => <Card key={optionIndex}><Body>{option}</Body><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{categories.map((category) => { const active = classification[String(optionIndex)] === category.id, right = Boolean(result) && correctGroups[String(optionIndex)] === category.id; return <Pressable accessibilityRole="radio" accessibilityLabel={`${option}: ${category.label}`} accessibilityState={{ selected: active, disabled: Boolean(result) }} key={category.id} disabled={Boolean(result)} onPress={() => choose(() => setClassification((current) => ({ ...current, [String(optionIndex)]: category.id })))} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: right ? colors.green : active ? colors.violet : colors.lineStrong, backgroundColor: right ? "rgba(34,211,164,.12)" : active ? "rgba(107,92,255,.16)" : colors.panel2 }}><Text style={{ color: colors.text, fontWeight: "800" }}>{category.label}</Text></Pressable>; })}</View></Card>)}</View>;
    return <View style={{ gap: 10 }}>{challenge.options.map((option, optionIndex) => { const right = Boolean(result) && result?.correctIndex === optionIndex, wrong = Boolean(result) && selected === optionIndex && !right; return <Choice key={optionIndex} label={option} selected={selected === optionIndex} correct={right} wrong={wrong} disabled={Boolean(result)} prefix={String.fromCharCode(65 + optionIndex)} onPress={() => choose(() => setSelected(optionIndex))} />; })}</View>;
  }

  const score = result?.scoreFraction ?? (result?.correct ? 1 : 0);
  return <Screen>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><CogniMark size={26} animated={false} /><Eyebrow>{modeLabel ?? (mode === "diagnostic" ? "Starting check" : mode === "practice" ? "Skill practice" : "Daily practice")}</Eyebrow></View><Text style={{ color: colors.muted, fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{Math.min(answered.size + 1, challenges.length)} of {challenges.length}</Text></View>
    <ProgressBar value={progress} />
    {challenge.scenario_context ? <Card style={{ backgroundColor: "rgba(0,229,255,.04)", borderColor: "rgba(0,229,255,.26)" }}><Body muted>{challenge.scenario_context}</Body></Card> : null}
    <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Eyebrow>{formatLabels[type] ?? "Question"}</Eyebrow><Text style={{ color: colors.purple, fontSize: 13, fontWeight: "900" }}>{difficulty(challenge.difficulty)}</Text></View><Title size={28}>{challenge.title}</Title><Body>{challenge.prompt}</Body></Card>
    {renderAnswers()}
    {challenge.confidence_required && !result ? <Card><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>How sure are you?</Text><Text style={{ color: colors.cyan, fontWeight: "900" }}>{confidence}%</Text></View><View accessibilityRole="radiogroup" style={{ flexDirection: "row", gap: 8 }}>{[40,60,80,100].map((value) => <Pressable accessibilityRole="radio" accessibilityLabel={`${value} percent confident`} accessibilityState={{ selected: confidence === value }} key={value} onPress={() => choose(() => setConfidence(value))} style={{ flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: confidence === value ? colors.violet : colors.lineStrong, backgroundColor: confidence === value ? "rgba(107,92,255,.18)" : colors.panel2, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.text, fontWeight: "800" }}>{value}</Text></Pressable>)}</View></Card> : null}
    {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, fontSize: 15, lineHeight: 22 }}>{error}</Text> : null}
    {!result ? <PrimaryButton label={busy ? "Checking…" : type === "ranking" ? "Use this order" : type === "classification" ? "Check my groups" : type === "multi_select" ? "Submit answers" : "Submit answer"} onPress={() => void submit()} disabled={!ready || busy} /> : <View style={{ gap: 12 }}><Card style={{ borderColor: result.correct ? "rgba(34,211,164,.58)" : score >= .5 ? "rgba(255,176,32,.5)" : "rgba(255,141,199,.48)" }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flex: 1 }}><Eyebrow>{result.correct ? "Correct" : score >= .5 ? "Partly right" : "Worth reviewing"}</Eyebrow><Title size={25}>{result.correct ? "Strong reasoning" : score >= .5 ? "Good progress" : "Review the reasoning"}</Title></View><LinearGradient colors={result.correct ? ["rgba(34,211,164,.22)", "rgba(0,229,255,.12)"] : ["rgba(107,92,255,.2)", "rgba(184,85,255,.16)"]} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 }}><Text style={{ color: colors.cyan, fontSize: 15, fontWeight: "900" }}>+{result.xpEarned} XP</Text></LinearGradient></View></Card><Body>{result.explanation}</Body>{result.skillUpdates?.length ? <Card><Eyebrow>Skill movement</Eyebrow>{result.skillUpdates.map((update) => <View key={update.slug} style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}><Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "800" }}>{(update.name ?? update.slug).replace(/^./, (c) => c.toUpperCase())}</Text><Text style={{ color: Number(update.delta ?? 0) >= 0 ? colors.green : colors.danger, fontSize: 16, fontWeight: "900" }}>{Number(update.delta ?? 0) >= 0 ? "+" : ""}{Number(update.delta ?? 0).toFixed(1)}</Text></View>)}</Card> : null}<Card><Eyebrow>Key idea</Eyebrow><Body>{result.thinkingPrinciple}</Body></Card><Card><Eyebrow>Why this matters with AI</Eyebrow><Body>{result.application}</Body></Card><PrimaryButton label="Keep going" onPress={() => void next()} /></View>}
  </Screen>;
}
