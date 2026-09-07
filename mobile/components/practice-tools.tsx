import React from "react";
import { AccessibilityInfo, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Body, Card, Eyebrow, PrimaryButton, ProgressBar, Title } from "./ui";
import { useNotebook } from "@/lib/notebook";
import { weekProgress, type SavedIdea } from "@/lib/notebook-store";
import { practiceLens } from "@/lib/practice-lenses";
import { SkillMotif } from "./visuals";
import { colors } from "@/lib/theme";

export function DeviceToolsNotice() {
  const tools = useNotebook();
  return tools.error ? <Card style={{ borderColor: colors.amber }}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{tools.error}</Text><PrimaryButton secondary label="Retry device storage" onPress={() => void tools.reload()} /></Card> : null;
}
export function SaveIdeaButton({ idea }: { idea: Omit<SavedIdea, "savedOn"> }) {
  const tools = useNotebook();
  const saved = tools.data.ideas.some(item => item.id === idea.id);
  return <PrimaryButton secondary label={saved ? "Key idea saved" : "Save key idea"} disabled={!tools.ready || tools.busy || saved} accessibilityHint="Keeps this takeaway privately on this device for this account. No scores are shared." onPress={() => { void tools.save(idea).then(() => AccessibilityInfo.announceForAccessibility("Key idea saved on this device.")).catch(() => undefined); }} />;
}
export function PracticeRhythm({ editable = false }: { editable?: boolean }) {
  const tools = useNotebook(); const { fontScale } = useWindowDimensions();
  const week = weekProgress(tools.data);
  return <Card style={{ gap: 14, backgroundColor:"#112b42", borderColor:"#3d6585" }}>
    <Eyebrow>Your weekly rhythm</Eyebrow>
    <Title size={23}>{!tools.ready ? "Your pace, your choice" : week.goal ? `${week.count} of ${week.goal} practice days` : "A little, often. At your pace."}</Title>
    {tools.ready && week.goal ? <Body muted style={{ fontSize: 14, lineHeight: 21 }}>{week.count >= week.goal ? "Your weekly target is met. Take a break, or keep exploring because you’re curious." : "Any day you submit an answer counts. A missed day does not erase your progress."}</Body> : <Body muted style={{ fontSize: 14, lineHeight: 21 }}>Choose an optional target, not a deadline. No reminders, penalties or streak resets.</Body>}
    {tools.ready && week.goal ? <ProgressBar value={Math.min(100, week.count / week.goal * 100)} /> : null}
    {tools.ready && fontScale <= 1.3 ? <View accessible accessibilityLabel={week.days.map(day => `${day.label} ${day.key}: ${day.done ? "practised" : day.future ? "upcoming" : "not recorded"}${day.today ? ", today" : ""}`).join(". ")} style={{ flexDirection: "row", justifyContent: "space-between", gap: 3 }}>
      {week.days.map(day => <View key={day.key} importantForAccessibility="no-hide-descendants" style={{ flex: 1, gap: 7, alignItems: "center" }}><Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{day.label}</Text><View style={{ width: 29, height: 29, borderRadius: 15, borderWidth: day.today ? 2 : 1, borderColor: day.today ? colors.purple : day.done ? colors.cyan : colors.line, backgroundColor: day.done ? "rgba(100,215,200,.17)" : colors.bg, alignItems: "center", justifyContent: "center" }}><Text style={{ color: day.done ? colors.cyan : colors.soft, fontSize: 15, lineHeight: 20 }}>{day.done ? "✓" : day.today ? "·" : "–"}</Text></View></View>)}
    </View> : tools.ready ? <Body muted>{week.count} recorded practice {week.count === 1 ? "day" : "days"} this week.</Body> : null}
    {editable || (tools.ready && !week.goal) ? <View accessibilityRole="radiogroup" accessibilityLabel="Optional weekly practice target" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {([2, 3, 5, null] as const).map(goal => <Pressable key={String(goal)} accessibilityRole="radio" accessibilityLabel={goal ? `${goal} days a week` : "No weekly target"} accessibilityState={{ checked: week.goal === goal, disabled: !tools.ready || tools.busy }} disabled={!tools.ready || tools.busy} onPress={() => { void tools.setGoal(goal).catch(() => undefined); }} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: week.goal === goal ? colors.cyan : colors.lineStrong, backgroundColor: week.goal === goal ? "rgba(100,215,200,.1)" : colors.panel2, opacity: pressed ? .75 : 1, justifyContent: "center" })}><Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: "700" }}>{goal ? `${goal} days` : "No target"}</Text></Pressable>)}
    </View> : <Pressable accessibilityRole="button" accessibilityLabel="Change weekly target" onPress={() => router.push("/toolkit")} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.purple, fontSize: 14, fontWeight: "700" }}>Change target →</Text></Pressable>}
    <Body muted style={{ fontSize: 12, lineHeight: 18 }}>On this device since version 0.4.4. Monday–Sunday, using your device’s dates. Your online history is unchanged.</Body>
  </Card>;
}
export function ToolkitShortcut() {
  const { data, ready } = useNotebook();
  return <Pressable accessibilityRole="button" accessibilityLabel="Open saved ideas" accessibilityHint="Revisit your privately saved takeaways, even when offline" onPress={() => router.push("/toolkit")} style={({ pressed }) => ({ opacity: pressed ? .8 : 1, minHeight: 48 })}>
    <LinearGradient colors={["#253760", "#152543"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, borderRadius: 24, borderWidth: 1, borderColor: "#677dac", gap: 8 }}>
      <View style={{flexDirection:"row",alignItems:"center",gap:12}}><SkillMotif kind="perspective" size={42} /><View style={{flex:1}}><Eyebrow>Your thinking toolkit</Eyebrow></View></View><Title size={23}>{ready && data.ideas.length ? `${data.ideas.length} ${data.ideas.length === 1 ? "idea" : "ideas"} worth keeping` : "Keep what clicks."}</Title>
      <Body muted style={{ fontSize: 14, lineHeight: 21 }}>{ready && data.ideas.length ? data.ideas[0].title : "Save a useful takeaway after a question. Come back to it when a real decision needs it."}</Body>
      <Text style={{ color: colors.purple, fontSize: 14, lineHeight: 21, fontWeight: "700" }}>Open saved ideas →</Text>
    </LinearGradient>
  </Pressable>;
}
export function DailyLens({ audience }: { audience?: string | null }) {
  const { today } = useNotebook(); const lens = practiceLens(today, audience);
  return <Card style={{ borderColor: "rgba(102,210,197,.38)", backgroundColor: "#112a37", gap: 12 }}>
    <Eyebrow>Try this outside the app</Eyebrow><Title size={23}>{lens.title}</Title><Body>{lens.prompt}</Body><Body muted style={{ fontSize: 14, lineHeight: 21 }}>{lens.context}</Body>
    <SaveIdeaButton idea={{ id: `lens-${lens.id}`, title: lens.title, principle: lens.principle, application: lens.prompt }} />
    <Body muted style={{ fontSize: 12, lineHeight: 18 }}>A rotating reflection prompt. It is not scored.</Body>
  </Card>;
}
