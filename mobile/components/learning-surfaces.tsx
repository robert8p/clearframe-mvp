import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Body, EditorialPanel, Eyebrow, PrimaryButton, ProgressBar, SectionHeader, Title, TrainButton } from "./ui";
import { getTrainingAction } from "@/lib/training-action";
import { boundedScore, evidenceLabel, skillDetails, trainingPresentation } from "@/lib/learning-view";
import { CogniIcon, LandscapeArtwork, SkillMotif, motifForSkill } from "./visuals";
import { CogniMark } from "./brand";
import { colors, glow, radius, typography } from "@/lib/theme";
import type { SkillScore, TodayResponse } from "@/lib/types";

export function TrainingCard({ today, onPress, busy = false, label }: { today: TodayResponse | null; onPress: () => void; busy?: boolean; label?: string }) {
  const presentation = trainingPresentation(today); const action = getTrainingAction(today);
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 390 || fontScale > 1.22;
  const artHeight = compact ? 144 : 176;
  return (
    <View style={{ borderRadius: radius.xl, borderCurve: "continuous", overflow: "hidden", borderWidth: 1, borderColor: "rgba(111,168,255,.42)", backgroundColor: colors.panel, boxShadow: glow.hero }}>
      <View pointerEvents="none" accessible={false} style={{ minHeight: artHeight, backgroundColor: colors.bgRaised, overflow: "hidden" }}>
        <LandscapeArtwork height={artHeight} />
        <LinearGradient colors={["rgba(8,16,38,.04)", "rgba(8,16,38,.10)", "rgba(8,16,38,.62)"]} locations={[0, .44, 1]} style={{ position: "absolute", inset: 0 }} />
        <View style={{ position: "absolute", top: compact ? 18 : 24, right: compact ? 18 : 24, width: compact ? 86 : 112, height: compact ? 86 : 112, borderRadius: compact ? 43 : 56, backgroundColor: "rgba(37,99,235,.09)", boxShadow: glow.blue, alignItems: "center", justifyContent: "center" }}><CogniMark size={compact ? 58 : 76} /></View>
      </View>
      <View style={{ padding: 20, gap: 13 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Eyebrow>Today&apos;s focus</Eyebrow>
          <View style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(8,16,38,.70)", borderWidth: 1, borderColor: "rgba(34,211,238,.30)" }}><Text style={{ color: colors.text, fontSize: 12, ...typography.label }}>About 5 min</Text></View>
        </View>
        <Title size={30}>{presentation.title}</Title>
        <Body muted style={{ fontSize: 15, lineHeight: 22, maxWidth: 510 }}>{presentation.body}</Body>
        {presentation.progress !== null ? <ProgressBar value={presentation.progress} /> : null}
        <Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 19, ...typography.body }}>{presentation.detail}</Text>
        <TrainButton testID="training-primary-action" label={busy ? "Loading training…" : label ?? action.label} accessibilityHint={action.hint} loading={busy} onPress={onPress} />
      </View>
    </View>
  );
}

export function RefreshNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EditorialPanel style={{ borderColor: "rgba(245,158,11,.42)" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(245,158,11,.12)", borderWidth: 1, borderColor: "rgba(245,158,11,.38)", alignItems: "center", justifyContent: "center" }}><Text accessible={false} style={{ color: colors.gold, fontSize: 17 }}>↻</Text></View><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ flex: 1, color: colors.text, fontSize: 15, lineHeight: 22, ...typography.bodyMedium }}>Couldn&apos;t refresh. Showing the last view from this visit.</Text></View><Body muted style={{ fontSize: 14, lineHeight: 21 }}>{message}</Body><PrimaryButton secondary label="Try again" onPress={onRetry} /></EditorialPanel>;
}

export function SkillTile({ row, onPress, pro = false }: { row: SkillScore; onPress: () => void; pro?: boolean }) {
  const [focused, setFocused] = useState(false); const { fontScale } = useWindowDimensions(); const skill = skillDetails(row); const measured = Number(row.attempts) > 0; const score = boundedScore(row.score); const label = evidenceLabel(row); const available = Boolean(skill?.slug);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${skill?.name ?? "Topic"}. ${measured ? `Score ${Math.round(score)} out of 100. ` : ""}${label}.${pro ? " Cogni Pro practice." : ""}`} accessibilityHint={pro ? "Explore Cogni Pro for focused topic practice." : "Start a focused practice round."} accessibilityState={{ disabled: !available }} disabled={!available} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => ({ opacity: pressed ? .82 : 1 })}>
      <LinearGradient colors={focused ? ["rgba(37,99,235,.34)", "rgba(139,92,246,.20)"] : ["rgba(18,33,61,.92)", "rgba(15,23,42,.95)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ minHeight: 116, padding: 15, borderRadius: radius.lg, borderWidth: focused ? 1.5 : 1, borderColor: focused ? colors.cyan : colors.line, gap: 11, boxShadow: focused ? glow.blue : undefined }}>
        <View style={{ flexDirection: fontScale > 1.45 ? "column" : "row", gap: 13, alignItems: "center" }}><SkillMotif kind={motifForSkill(skill?.slug ?? skill?.name ?? "")} size={52} /><View style={{ flex: 1, gap: 4, alignSelf: "stretch", justifyContent: "center" }}><Text style={{ color: colors.text, fontSize: 17, lineHeight: 23, ...typography.heading }}>{skill?.name ?? "Skill"}</Text><Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18, ...typography.body }}>{label}{measured ? ` · ${row.attempts} observations` : ""}</Text></View>{measured ? <Text style={{ color: colors.cyan, fontSize: 25, lineHeight: 30, ...typography.metric, fontVariant: ["tabular-nums"] }}>{Math.round(score)}</Text> : <CogniIcon name="arrow" color={colors.soft} />}</View>
        {measured ? <ProgressBar value={score} /> : null}
        {skill?.description ? <Body muted style={{ fontSize: 13.5, lineHeight: 20 }}>{skill.description}</Body> : null}
        <Text style={{ color: colors.cyan, fontSize: 13.5, lineHeight: 20, ...typography.label }}>{!available ? "Practice unavailable" : pro ? "Explore Pro practice" : "Practise this topic"}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SkillShelf({ rows, onOpen, pro = false }: { rows: SkillScore[]; onOpen: (slug: string) => void; pro?: boolean }) {
  const { fontScale, width } = useWindowDimensions(); const columns = fontScale > 1.75 ? 1 : width < 600 || fontScale > 1.2 ? 2 : 4; const visible = rows.filter(row => skillDetails(row)?.slug).slice(0, 4); if (!visible.length) return null;
  return <View style={{ gap: 12 }}><SectionHeader title="Discover topics" /><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{visible.map(row => { const skill = skillDetails(row); const slug = skill?.slug; if (!skill || !slug) return null; return <Pressable key={row.skill_id} accessibilityRole="button" accessibilityLabel={`Explore ${skill.name}`} accessibilityHint={pro ? "Explore Pro focused topic practice" : "Start focused practice"} onPress={() => onOpen(slug)} style={({ pressed }) => ({ flexBasis: columns === 1 ? "100%" : columns === 2 ? "45%" : "21%", flexGrow: 1, minWidth: columns === 1 ? 0 : 104, minHeight: 116, padding: 13, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(15,23,42,.86)", alignItems: "center", justifyContent: "center", gap: 9, opacity: pressed ? .8 : 1 })}><SkillMotif kind={motifForSkill(slug)} size={48} /><Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, ...typography.label, textAlign: "center" }}>{skill.name}</Text></Pressable>; })}</View></View>;
}
