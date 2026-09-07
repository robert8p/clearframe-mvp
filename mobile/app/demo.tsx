import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View, type ScrollView } from "react-native";
import { router } from "expo-router";
import { Body, Card, Eyebrow, PrimaryButton, ProgressBar, Screen, Title } from "@/components/ui";
import { SAMPLE_DECISIONS } from "@/lib/practice-lenses";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/accessibility";
import { useFeedback } from "@/lib/feedback";

export default function DemoScreen() {
  const [index, setIndex] = useState(0), [selected, setSelected] = useState<number | null>(null), [revealed, setRevealed] = useState(false);
  const reducedMotion = useReducedMotion(); const { playFeedback } = useFeedback();
  const scroll = useRef<ScrollView>(null);
  const question = SAMPLE_DECISIONS[index];
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [index]);
  function reveal() {
    if (selected === null || revealed || !question) return;
    setRevealed(true); playFeedback(selected === question.correct ? "correct" : "review");
    AccessibilityInfo.announceForAccessibility(selected === question.correct ? "A useful next step. Read the reasoning below." : "Another approach is worth considering. Read the reasoning below.");
  }
  if (!question) return <Screen><Eyebrow>That is Cogni in miniature</Eyebrow><Title size={32}>Less guessing. More questioning.</Title><Body>Choose a decision, explore the reasoning, and take one useful idea into your day.</Body><Card><Title size={23}>Make the practice yours</Title><Body muted>Choose from six learning contexts, build a starting profile and follow short, varied practice. Your sample answers do not affect your scores.</Body></Card><PrimaryButton label="Get started" trailingArrow onPress={() => router.replace("/signup")} /><PrimaryButton secondary label="Back to welcome" onPress={() => router.replace("/")} /></Screen>;
  return <Screen ref={scroll}>
    <View style={{ gap: 8 }}><Eyebrow>Try before you join</Eyebrow><Title size={29}>A decision worth a pause.</Title><Body muted style={{ fontSize: 14, lineHeight: 21 }}>Sample {index + 1} of {SAMPLE_DECISIONS.length} · No account needed. These answers stay on this screen.</Body></View>
    <ProgressBar value={index / SAMPLE_DECISIONS.length * 100} />
    <Card><Title size={25}>{question.title}</Title><Body>{question.prompt}</Body></Card>
    <View accessibilityRole="radiogroup" accessibilityLabel="Choose a sample answer" style={{ gap: 10 }}>
      {question.options.map((option, optionIndex) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={option} accessibilityState={{ checked: selected === optionIndex, disabled: revealed }} disabled={revealed} onPress={() => { setSelected(optionIndex); playFeedback("selection"); }} style={({ pressed }) => ({ minHeight: 56, padding: 17, borderRadius: 16, borderWidth: 1, borderColor: revealed && question.correct === optionIndex ? colors.green : selected === optionIndex ? colors.cyan : colors.lineStrong, backgroundColor: selected === optionIndex ? "#192d42" : colors.panel, opacity: pressed ? .8 : 1, flexDirection: "row", gap: 12, alignItems: "flex-start" })}>
        <Text accessible={false} style={{ color: colors.cyan, fontWeight: "800", fontSize: 16, lineHeight: 24 }}>{revealed && question.correct === optionIndex ? "✓" : String.fromCharCode(65 + optionIndex)}</Text><Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 24 }}>{option}</Text>
      </Pressable>)}
    </View>
    {!revealed ? <PrimaryButton label="See the reasoning" disabled={selected === null} onPress={reveal} /> : <View onLayout={event => scroll.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 12), animated: !reducedMotion })} style={{ gap: 16 }}><Card style={{ borderColor: colors.cyan }}><Eyebrow>{selected === question.correct ? "A useful next step" : "Another approach to consider"}</Eyebrow><Body>{question.explanation}</Body><Title size={22}>{question.principle}</Title></Card><PrimaryButton label={index === SAMPLE_DECISIONS.length - 1 ? "Finish the sample" : "Try another decision"} trailingArrow onPress={() => { setIndex(value => value + 1); setSelected(null); setRevealed(false); }} /></View>}
    <PrimaryButton secondary label="Back to welcome" onPress={() => router.replace("/")} />
  </Screen>;
}
