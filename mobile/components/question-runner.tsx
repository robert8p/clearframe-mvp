import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { apiFetch } from "@/lib/api";
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
  const border = correct ? colors.green : wrong ? colors.pink : selected ? colors.violet : colors.line;
  const background = correct ? "rgba(41,214,125,0.10)" : wrong ? "rgba(236,72,153,0.10)" : selected ? "rgba(105,92,255,0.14)" : colors.panel;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 58, borderWidth: 1, borderColor: border, backgroundColor: background, borderRadius: 18, borderCurve: "continuous", padding: 14, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.78 : 1 })}>{prefix ? <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: "#16213b", alignItems: "center", justifyContent: "center" }}><Text style={{ color: correct ? colors.green : colors.muted, fontSize: 14, fontWeight: "800" }}>{prefix}</Text></View> : null}<Text style={{ flex: 1, color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: "650" }}>{label}</Text>{correct ? <Text style={{ color: colors.green, fontSize: 20, fontWeight: "900" }}>✓</Text> : null}</Pressable>;
}

export function QuestionRunner({ mode, sessionId, challenges, answeredChallengeIds = [], modeLabel, onComplete }: Props) {
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
  const challenge = challenges[index];
  const type = challenge?.interaction_type ?? "single_choice";
  const categories = ((challenge?.interaction_config?.categories ?? []) as Category[]).filter((item) => item?.id && item?.label);
  const correctList = correctArray(result?.correctAnswer);
  const correctGroups = correctMap(result?.correctAnswer);
  const progress = challenges.length ? answered.size / challenges.length * 100 : 0;

  useEffect(() => { setStartedAt(Date.now()); }, [index]);
  if (!challenge) return <Screen><Card><Title size={24}>No questions available</Title><Body muted>Return to Train and try again.</Body><PrimaryButton label="Done" onPress={() => void onComplete()} /></Card></Screen>;

  const ready = type === "multi_select" ? multi.length > 0 : type === "ranking" ? ranking.length === challenge.options.length : type === "classification" ? challenge.options.length > 0 && challenge.options.every((_item, optionIndex) => Boolean(classification[String(optionIndex)])) : selected !== null;

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
    if (nextIndex < 0) { await onComplete(); return; }
    setIndex(nextIndex); setSelected(null); setMulti([]); setRanking([]); setClassification({}); setConfidence(60); setResult(null); setError(""); setStartedAt(Date.now());
  }

  function renderAnswers() {
    if (type === "multi_select") return <View style={{ gap: 10 }}>{challenge.options.map((option, optionIndex) => { const active = multi.includes(optionIndex), right = Boolean(result) && correctList.includes(optionIndex), wrong = Boolean(result) && active && !right; return <Choice key={optionIndex} label={option} selected={active} correct={right} wrong={wrong} disabled={Boolean(result)} prefix={active ? "✓" : ""} onPress={() => setMulti((current) => current.includes(optionIndex) ? current.filter((value) => value !== optionIndex) : [...current, optionIndex])} />; })}</View>;
    if (type === "ranking") {
      const remaining = challenge.options.map((option, optionIndex) => ({ option, optionIndex })).filter((item) => !ranking.includes(item.optionIndex));
      return <View style={{ gap: 10 }}>{ranking.map((optionIndex, rankIndex) => <Choice key={`rank-${optionIndex}`} label={challenge.options[optionIndex]} prefix={String(rankIndex + 1)} disabled={Boolean(result)} onPress={() => setRanking((current) => current.filter((value) => value !== optionIndex))} />)}{!result ? remaining.map(({ option, optionIndex }) => <Choice key={optionIndex} label={option} prefix="+" onPress={() => setRanking((current) => [...current, optionIndex])} />) : null}{result ? <Card><Eyebrow>Best order</Eyebrow>{correctList.map((optionIndex, rankIndex) => <Body key={`${optionIndex}-${rankIndex}`}>{rankIndex + 1}. {challenge.options[optionIndex]}</Body>)}</Card> : null}</View>;
    }
    if (type === "classification") return <View style={{ gap: 10 }}>{challenge.options.map((option, optionIndex) => <Card key={optionIndex}><Body>{option}</Body><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{categories.map((category) => { const active = classification[String(optionIndex)] === category.id, right = Boolean(result) && correctGroups[String(optionIndex)] === category.id; return <Pressable key={category.id} disabled={Boolean(result)} onPress={() => setClassification((current) => ({ ...current, [String(optionIndex)]: category.id }))} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 13, borderRadius: 999, borderWidth: 1, borderColor: right ? colors.green : active ? colors.violet : colors.line, backgroundColor: right ? "rgba(41,214,125,.10)" : active ? "rgba(105,92,255,.14)" : colors.panel2 }}><Text style={{ color: colors.text, fontWeight: "700" }}>{category.label}</Text></Pressable>; })}</View></Card>)}</View>;
    return <View style={{ gap: 10 }}>{challenge.options.map((option, optionIndex) => { const right = Boolean(result) && result?.correctIndex === optionIndex, wrong = Boolean(result) && selected === optionIndex && !right; return <Choice key={optionIndex} label={option} selected={selected === optionIndex} correct={right} wrong={wrong} disabled={Boolean(result)} prefix={String.fromCharCode(65 + optionIndex)} onPress={() => setSelected(optionIndex)} />; })}</View>;
  }

  const score = result?.scoreFraction ?? (result?.correct ? 1 : 0);
  return <Screen>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><Eyebrow>{modeLabel ?? (mode === "diagnostic" ? "Starting check" : mode === "practice" ? "Skill practice" : "Daily questions")}</Eyebrow><Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{Math.min(answered.size + 1, challenges.length)} of {challenges.length}</Text></View>
    <ProgressBar value={progress} />
    {challenge.scenario_context ? <Card style={{ backgroundColor: "rgba(34,211,238,.04)", borderColor: "rgba(34,211,238,.18)" }}><Body muted>{challenge.scenario_context}</Body></Card> : null}
    <Card><Eyebrow>{formatLabels[type] ?? "Question"}</Eyebrow><View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}><Text style={{ color: colors.muted, fontSize: 14 }}>Chosen for you</Text><Text style={{ color: colors.muted, fontSize: 14 }}>{difficulty(challenge.difficulty)} level</Text></View><Title size={29}>{challenge.title}</Title><Body>{challenge.prompt}</Body></Card>
    {renderAnswers()}
    {challenge.confidence_required && !result ? <Card><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>How sure are you?</Text><Text style={{ color: colors.cyan, fontWeight: "800" }}>{confidence}%</Text></View><View style={{ flexDirection: "row", gap: 8 }}>{[40,60,80,100].map((value) => <Pressable key={value} onPress={() => setConfidence(value)} style={{ flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: confidence === value ? colors.violet : colors.line, backgroundColor: confidence === value ? "rgba(105,92,255,.16)" : colors.panel2, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.text, fontWeight: "700" }}>{value}</Text></Pressable>)}</View></Card> : null}
    {error ? <Text selectable style={{ color: "#ff9ac0", fontSize: 15, lineHeight: 22 }}>{error}</Text> : null}
    {!result ? <PrimaryButton label={busy ? "Checking…" : type === "ranking" ? "Use this order" : type === "classification" ? "Check my groups" : type === "multi_select" ? "Submit answers" : "Submit answer"} onPress={() => void submit()} disabled={!ready || busy} /> : <View style={{ gap: 12 }}><Card style={{ borderColor: result.correct ? "rgba(41,214,125,.55)" : score >= .5 ? "rgba(245,158,11,.5)" : "rgba(236,72,153,.4)" }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flex: 1 }}><Eyebrow>{result.correct ? "Correct" : score >= .5 ? "Partly right" : "Worth reviewing"}</Eyebrow><Title size={25}>{result.correct ? "Good choice" : score >= .5 ? "Nearly there" : "Now you’ve seen it"}</Title></View><Text style={{ color: colors.cyan, fontSize: 18, fontWeight: "900" }}>+{result.xpEarned} XP</Text></View></Card><Body>{result.explanation}</Body>{result.skillUpdates?.length ? <Card><Eyebrow>Skill movement</Eyebrow>{result.skillUpdates.map((update) => <View key={update.slug} style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}><Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "700" }}>{(update.name ?? update.slug).replace(/^./, (c) => c.toUpperCase())}</Text><Text style={{ color: Number(update.delta ?? 0) >= 0 ? colors.green : colors.pink, fontSize: 16, fontWeight: "800" }}>{Number(update.delta ?? 0) >= 0 ? "+" : ""}{Number(update.delta ?? 0).toFixed(1)}</Text></View>)}</Card> : null}<Card><Eyebrow>Key idea</Eyebrow><Body>{result.thinkingPrinciple}</Body></Card><Card><Eyebrow>Why this matters with AI</Eyebrow><Body>{result.application}</Body></Card><PrimaryButton label="Keep going →" onPress={() => void next()} /></View>}
  </Screen>;
}
