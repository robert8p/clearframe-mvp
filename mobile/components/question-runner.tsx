import React, { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, Text, View, type ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { apiFetch } from "@/lib/api";
import { useReducedMotion } from "@/lib/accessibility";
import { useFeedback } from "@/lib/feedback";
import { useNotebook } from "@/lib/notebook";
import { SaveIdeaButton, DeviceToolsNotice } from "@/components/practice-tools";
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

function Choice({ label, selected, correct, wrong, onPress, disabled, prefix, role = "button", hint, accessibilityLabel }: { label: string; selected?: boolean; correct?: boolean; wrong?: boolean; onPress: () => void; disabled?: boolean; prefix?: string; role?: "button" | "radio" | "checkbox"; hint?: string; accessibilityLabel?: string }) {
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

  const border = correct ? colors.green : wrong ? colors.pink : selected ? colors.cyan : colors.lineStrong;
  const background = correct ? "rgba(34,211,164,0.13)" : wrong ? "rgba(236,72,153,0.10)" : selected ? "#193857" : "#142340";
  return <Animated.View style={{ transform: [{ scale }] }}><Pressable accessibilityRole={role} accessibilityHint={hint} accessibilityLabel={`${accessibilityLabel ?? label}${correct ? ". Correct answer" : wrong ? ". Your answer, worth reviewing" : ""}`} accessibilityState={{ ...(role === "button" ? { selected: Boolean(selected) } : { checked: Boolean(selected) }), disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ minHeight: 60, borderWidth: selected && !correct && !wrong ? 2 : 1, borderColor: border, backgroundColor: background, borderRadius: 20, borderCurve: "continuous", padding: 16, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.80 : 1 })}>{prefix ? <LinearGradient colors={selected || correct ? ["rgba(0,229,255,.18)", "rgba(107,92,255,.24)"] : ["rgba(27,38,80,.9)", "rgba(19,27,59,.9)"]} style={{ width: 36, minHeight: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}><Text style={{ color: correct ? colors.green : selected ? colors.cyan : colors.muted, fontSize: 14, fontWeight: "900" }}>{prefix}</Text></LinearGradient> : null}<Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: "600" }}>{label}</Text>{correct ? <Text accessibilityLabel="Correct" style={{ color: colors.green, fontSize: 20, fontWeight: "900" }}>✓</Text> : wrong ? <Text accessibilityLabel="Incorrect" style={{ color: colors.danger, fontSize: 18, fontWeight: "900" }}>×</Text> : selected ? <Text accessible={false} style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>✓</Text> : null}</Pressable></Animated.View>;
}

export function QuestionRunner({ mode, sessionId, challenges, answeredChallengeIds = [], modeLabel, onComplete }: Props) {
  const { playFeedback } = useFeedback();
  const reducedMotion = useReducedMotion();
  const initialAnswered = useMemo(() => new Set(answeredChallengeIds.filter(id => challenges.some(challenge => challenge.id === id))), [answeredChallengeIds, challenges]);
  const { recordPracticeDay } = useNotebook();
  const [visitIdeas, setVisitIdeas] = useState<{ id: string; title: string; principle: string; application: string }[]>([]);
  const firstPending = challenges.findIndex((item) => !initialAnswered.has(item.id));
  const [index, setIndex] = useState(firstPending);
  const [answered, setAnswered] = useState(new Set(initialAnswered));
  const [selected, setSelected] = useState<number | null>(null);
  const [multi, setMulti] = useState<number[]>([]);
  const [ranking, setRanking] = useState<number[]>([]);
  const [classification, setClassification] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const submitLock = useRef(false);
  const nextLock = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(Date.now());
  const resultCueChallengeRef = useRef<string | null>(null);
  const resultScrollChallengeRef = useRef<string | null>(null);
  const challenge = challenges[index];
  const type = challenge?.interaction_type ?? "single_choice";
  const categories = ((challenge?.interaction_config?.categories ?? []) as Category[]).filter((item) => item?.id && item?.label);
  const requiredSelectionsRaw = Number(challenge?.interaction_config?.requiredSelections ?? challenge?.interaction_config?.required_selections ?? 0);
  const requiredSelections = Number.isInteger(requiredSelectionsRaw) && requiredSelectionsRaw > 0 ? requiredSelectionsRaw : null;
  const correctList = correctArray(result?.correctAnswer);
  const correctGroups = correctMap(result?.correctAnswer);
  const progress = challenges.length ? answered.size / challenges.length * 100 : 0;

  useEffect(() => {
    setStartedAt(Date.now());
    submitLock.current = false; nextLock.current = false; setAdvancing(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [index]);
  useEffect(() => {
    if (!result || !challenge || resultCueChallengeRef.current === challenge.id) return;
    resultCueChallengeRef.current = challenge.id;
    const score = result.scoreFraction ?? (result.correct ? 1 : 0);
    const verdict = result.correct ? "Correct." : score >= .5 ? "Partly right." : "Worth reviewing.";
    AccessibilityInfo.announceForAccessibility(`${verdict} You earned ${result.xpEarned} XP.`);
    playFeedback(result.correct ? "correct" : score >= .5 ? "review" : "incorrect");
  }, [challenge, playFeedback, result]);

  if (!challenge) return <Screen><Card><Title size={24}>{challenges.length ? "You’re all caught up" : "No questions available"}</Title><Body muted>{challenges.length ? "Your answers are saved. Return to Train for your next step." : "Return to Train and try again."}</Body>{error ? <Text accessibilityLiveRegion="assertive" style={{ color: colors.danger }}>{error}</Text> : null}<PrimaryButton label={mode === "practice" ? "Back to skills" : "Back to training"} loading={advancing} onPress={() => { void finish(); }} /></Card></Screen>;

  async function finish() {
    if (nextLock.current) return;
    nextLock.current = true; setAdvancing(true); setError("");
    try { await onComplete(); }
    catch { nextLock.current = false; setAdvancing(false); setError("We couldn’t open the next screen. Your answers are saved. Try again."); }
  }

  const multiReady = requiredSelections ? multi.length === requiredSelections : multi.length > 0;
  const answerReady = type === "multi_select" ? multiReady : type === "ranking" ? ranking.length === challenge.options.length : type === "classification" ? challenge.options.length > 0 && challenge.options.every((_item, optionIndex) => Boolean(classification[String(optionIndex)])) : selected !== null;
  const ready = answerReady && (!challenge.confidence_required || confidence !== null);

  async function submit() {
    if (!ready || busy || result || submitLock.current) return;
    submitLock.current = true;
    setBusy(true); setError("");
    const responsePayload = type === "multi_select" ? multi : type === "ranking" ? ranking : type === "classification" ? classification : selected;
    try {
      const response = await apiFetch<AnswerResult>("/api/mobile/answer", { method: "POST", body: JSON.stringify({ challengeId: challenge.id, selectedIndex: type === "single_choice" || type === "triage" ? selected : undefined, responsePayload, confidence: challenge.confidence_required ? confidence : null, responseTimeMs: Math.min(3600000, Math.max(0, Date.now() - startedAt)), mode, sessionId }) });
      setResult(response); setAnswered((current) => new Set([...current, challenge.id]));
      setVisitIdeas(current => [...current.filter(idea => idea.id !== challenge.id), { id: challenge.id, title: challenge.title, principle: response.thinkingPrinciple, application: response.application }]);
      // A local rhythm never changes the server score or blocks submitted answers.
      void recordPracticeDay().catch(() => undefined);
    } catch (caught) { submitLock.current = false; setError(caught instanceof Error ? caught.message : "Could not submit your answer. Please try again."); }
    finally { setBusy(false); }
  }

  async function next() {
    if (!result || nextLock.current) return;
    const completed = new Set([...answered, challenge.id]);
    const nextIndex = challenges.findIndex((candidate, candidateIndex) => candidateIndex > index && !completed.has(candidate.id));
    if (nextIndex < 0) { playFeedback("complete"); setShowSummary(true); scrollRef.current?.scrollTo({y:0,animated:false}); return; }
    nextLock.current = true; setAdvancing(true);
    setIndex(nextIndex); setSelected(null); setMulti([]); setRanking([]); setClassification({}); setConfidence(null); setResult(null); setError(""); setStartedAt(Date.now());
  }

  function choose(action: () => void) {
    if (busy || result || submitLock.current) return;
    action();
    playFeedback("selection");
  }

  function renderAnswers() {
    if (type === "multi_select") return <View style={{ gap: 10 }}>
      {requiredSelections && !result ? <Text accessibilityLiveRegion="polite" style={{ color: multi.length === requiredSelections ? colors.green : colors.muted, fontSize: 13.5, lineHeight: 20, fontWeight: "800" }}>Choose exactly {requiredSelections} · {multi.length}/{requiredSelections} selected{multi.length === requiredSelections ? ". Deselect an answer to change your choices." : ""}</Text> : null}
      {challenge.options.map((option, optionIndex) => {
        const active = multi.includes(optionIndex), right = Boolean(result) && correctList.includes(optionIndex), wrong = Boolean(result) && active && !right;
        return <Choice key={optionIndex} role="checkbox" label={option} selected={active} correct={right} wrong={wrong} disabled={Boolean(result) || busy} prefix={active ? "✓" : ""} onPress={() => {
          if (!active && requiredSelections && multi.length >= requiredSelections) return;
          choose(() => setMulti((current) => current.includes(optionIndex) ? current.filter((value) => value !== optionIndex) : [...current, optionIndex]));
        }} />;
      })}
    </View>;
    if (type === "ranking") {
      const remaining = challenge.options.map((option, optionIndex) => ({ option, optionIndex })).filter((item) => !ranking.includes(item.optionIndex));
      return <View style={{ gap: 10 }}>{!result ? <Body muted>Tap each answer in your chosen order. Tap a numbered answer to remove it, then add it again where you want it.</Body> : <Eyebrow>Your order</Eyebrow>}{!result ? <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 14 }}>{ranking.length} of {challenge.options.length} placed</Text> : null}{ranking.map((optionIndex, rankIndex) => <Choice key={`rank-${optionIndex}`} label={challenge.options[optionIndex]} accessibilityLabel={`${rankIndex + 1}. ${challenge.options[optionIndex]}`} hint="Remove this answer from the order" prefix={String(rankIndex + 1)} disabled={Boolean(result) || busy} onPress={() => choose(() => setRanking((current) => current.filter((value) => value !== optionIndex)))} />)}{!result ? remaining.map(({ option, optionIndex }) => <Choice key={optionIndex} label={option} hint={`Add as number ${ranking.length + 1}`} prefix="+" disabled={busy} onPress={() => choose(() => setRanking((current) => [...current, optionIndex]))} />) : null}{result ? <Card><Eyebrow>Best order</Eyebrow>{correctList.map((optionIndex, rankIndex) => <Body key={`${optionIndex}-${rankIndex}`}>{rankIndex + 1}. {challenge.options[optionIndex]}</Body>)}</Card> : null}</View>;
    }
    if (type === "classification") return <View style={{ gap: 10 }}>{challenge.options.map((option, optionIndex) => <Card key={optionIndex}><Body>{option}</Body>{result ? <Text style={{color:colors.green,fontSize:14,lineHeight:21}}>Best group: {categories.find(category=>category.id === correctGroups[String(optionIndex)])?.label ?? "See the explanation"}</Text> : null}<View accessibilityRole="radiogroup" accessibilityLabel={option} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{categories.map((category) => { const active = classification[String(optionIndex)] === category.id, right = Boolean(result) && correctGroups[String(optionIndex)] === category.id; return <Pressable accessibilityRole="radio" accessibilityLabel={`${option}: ${category.label}`} accessibilityState={{ checked: active, disabled: Boolean(result) || busy }} key={category.id} disabled={Boolean(result) || busy} onPress={() => choose(() => setClassification((current) => ({ ...current, [String(optionIndex)]: category.id })))} style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: right ? colors.green : active ? colors.violet : colors.lineStrong, backgroundColor: right ? "rgba(34,211,164,.12)" : active ? "rgba(107,92,255,.16)" : colors.panel2 }}><Text style={{ color: colors.text, fontWeight: "800" }}>{category.label}</Text></Pressable>; })}</View></Card>)}</View>;
    return <View accessibilityRole="radiogroup" accessibilityLabel="Your answer" style={{ gap: 10 }}>{challenge.options.map((option, optionIndex) => { const right = Boolean(result) && result?.correctIndex === optionIndex, wrong = Boolean(result) && selected === optionIndex && !right; return <Choice key={optionIndex} role="radio" label={option} selected={selected === optionIndex} correct={right} wrong={wrong} disabled={Boolean(result) || busy} prefix={String.fromCharCode(65 + optionIndex)} onPress={() => choose(() => setSelected(optionIndex))} />; })}</View>;
  }

  if (showSummary) return <Screen><Card style={{borderColor:colors.cyan}}><Eyebrow>{mode === "diagnostic" ? "Starting check complete" : "Practice complete"}</Eyebrow><Title size={30}>Take one idea with you.</Title><Body>{answered.size} of {challenges.length} answers saved. A useful next step is to notice where this thinking applies today.</Body></Card><DeviceToolsNotice /><Eyebrow>Takeaways from this visit</Eyebrow>{visitIdeas.slice(-3).map(idea => <Card key={idea.id}><Title size={22}>{idea.title}</Title><Body>{idea.principle}</Body><SaveIdeaButton idea={idea} /></Card>)}<Body muted style={{ fontSize: 13, lineHeight: 20 }}>Showing up to three ideas from answers submitted in this visit. Saved ideas are available in your thinking toolkit.</Body><Body muted>Progress comes from understanding the reasoning, not chasing a perfect score.</Body>{error ? <Text accessibilityLiveRegion="assertive" style={{color:colors.danger}}>{error}</Text> : null}<PrimaryButton label={mode === "practice" ? "Back to skills" : "Back to training"} trailingArrow loading={advancing} onPress={()=>void finish()} /></Screen>;
  const score = result?.scoreFraction ?? (result?.correct ? 1 : 0);
  return <Screen ref={scrollRef}>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}><CogniMark size={26} animated={false} /><Eyebrow>{modeLabel ?? (mode === "diagnostic" ? "Starting check" : mode === "practice" ? "Skill practice" : "Daily practice")}</Eyebrow></View><Text style={{ color: colors.muted, fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{Math.min(index + 1, challenges.length)} of {challenges.length}</Text></View>
    <ProgressBar value={progress} />
    {challenge.scenario_context ? <Card style={{ backgroundColor: "rgba(0,229,255,.04)", borderColor: "rgba(0,229,255,.26)" }}><Body muted>{challenge.scenario_context}</Body></Card> : null}
    <Card><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Eyebrow>{formatLabels[type] ?? "Question"}</Eyebrow><Text style={{ color: colors.purple, fontSize: 13, fontWeight: "900" }}>{difficulty(challenge.difficulty)}</Text></View><Title size={28}>{challenge.title}</Title><Body>{challenge.prompt}</Body></Card>
    {renderAnswers()}
    {challenge.confidence_required && !result ? <Card><View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>How sure are you?</Text><Text style={{ color: colors.cyan, fontWeight: "900" }}>{confidence === null ? "Choose one" : `${confidence}%`}</Text></View><Body muted style={{ fontSize: 14, lineHeight: 21 }}>Choose how likely you think your answer is to be right. It is fine to be unsure.</Body><View accessibilityRole="radiogroup" accessibilityLabel="How sure are you?" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{[40,60,80,100].map((value) => <Pressable accessibilityRole="radio" accessibilityLabel={`${value} percent confident`} accessibilityState={{ checked: confidence === value, disabled: busy }} disabled={busy} key={value} onPress={() => choose(() => setConfidence(value))} style={{ flexGrow: 1, flexBasis: 58, minHeight: 48, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: confidence === value ? colors.violet : colors.lineStrong, backgroundColor: confidence === value ? "rgba(107,92,255,.18)" : colors.panel2, justifyContent: "center", alignItems: "center" }}><Text style={{ color: colors.text, fontWeight: "800" }}>{value}%</Text></Pressable>)}</View></Card> : null}
    {error ? <Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.danger, fontSize: 15, lineHeight: 22 }}>{error}</Text> : null}
    {!result && answerReady && challenge.confidence_required && confidence === null ? <Body muted>Choose your confidence above to submit.</Body> : null}
    {!result ? <PrimaryButton label={busy ? "Checking…" : type === "ranking" ? "Use this order" : type === "classification" ? "Check my groups" : type === "multi_select" ? "Submit answers" : "Submit answer"} onPress={() => void submit()} disabled={!ready} loading={busy} /> : <View onLayout={(event) => { if (resultScrollChallengeRef.current === challenge.id) return; resultScrollChallengeRef.current = challenge.id; scrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 12), animated: !reducedMotion }); }} style={{ gap: 12 }}><Card style={{ borderColor: result.correct ? "rgba(34,211,164,.58)" : score >= .5 ? "rgba(255,176,32,.5)" : "rgba(255,141,199,.48)" }}><View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flex: 1 }}><Eyebrow>{result.correct ? "Correct" : score >= .5 ? "Partly right" : "Worth reviewing"}</Eyebrow><Title size={25}>{result.correct ? "Strong reasoning" : score >= .5 ? "Good progress" : "Review the reasoning"}</Title></View><LinearGradient colors={result.correct ? ["rgba(34,211,164,.22)", "rgba(0,229,255,.12)"] : ["rgba(107,92,255,.2)", "rgba(184,85,255,.16)"]} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999 }}><Text style={{ color: colors.cyan, fontSize: 15, fontWeight: "900" }}>+{result.xpEarned} XP</Text></LinearGradient></View></Card><Body>{result.explanation}</Body>{result.skillUpdates?.length ? <Card><Eyebrow>Skill progress</Eyebrow>{result.skillUpdates.map((update) => <View key={update.slug} style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}><Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "800" }}>{(update.name ?? update.slug).replace(/^./, (c) => c.toUpperCase())}</Text><Text style={{ color: Number(update.delta ?? 0) >= 0 ? colors.green : colors.danger, fontSize: 16, fontWeight: "900" }}>{Number(update.delta ?? 0) >= 0 ? "+" : ""}{Number(update.delta ?? 0).toFixed(1)}</Text></View>)}</Card> : null}<Card><Eyebrow>Key idea</Eyebrow><Body>{result.thinkingPrinciple}</Body><SaveIdeaButton idea={{ id: challenge.id, title: challenge.title, principle: result.thinkingPrinciple, application: result.application }} /></Card><DeviceToolsNotice /><Card><Eyebrow>Why this matters with AI</Eyebrow><Body>{result.application}</Body></Card><PrimaryButton label={answered.size >= challenges.length ? "Finish training" : "Next question"} loading={advancing} trailingArrow onPress={() => void next()} /></View>}
  </Screen>;
}
