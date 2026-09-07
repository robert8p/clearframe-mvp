import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Body, Card, Eyebrow, PrimaryButton, Title } from "@/components/ui";
import { historyChange, historyDateLabel, historyPage, historySeries, type HistoryPoint } from "@/lib/learning-view";
import { colors } from "@/lib/theme";

export type ProgressHistory = {
  access: "full" | "limited";
  freeDays: number;
  windowDays: number | null;
  availableFrom: string | null;
  availableTo: string | null;
  points: HistoryPoint[];
};

function HistoryButton({ label, onPress, testID, expanded, disabled = false }: {
  label: string; onPress: () => void; testID: string; expanded?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ expanded, disabled }} disabled={disabled} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12,
      borderWidth: 1, borderColor: focused ? colors.cyan : colors.lineStrong, justifyContent: "center",
      backgroundColor: pressed ? colors.panel3 : colors.panel2, opacity: disabled ? 0.48 : 1 })}>
    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: "700", textAlign: "center" }}>{label}</Text>
  </Pressable>;
}

function HistorySkill({ id, label, observations, selected, onPress }: {
  id: string; label: string; observations: number; selected: boolean; onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return <Pressable testID={`progress-history-skill-${id}`} accessibilityRole="radio"
    accessibilityLabel={`${label}, ${observations} recorded ${observations === 1 ? "day" : "days"}`}
    accessibilityState={{ checked: selected }} onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => ({ minHeight: 48, borderWidth: 1, borderColor: selected || focused ? colors.cyan : colors.lineStrong,
      padding: 12, borderRadius: 12, gap: 3, backgroundColor: selected || pressed ? colors.panel3 : colors.panel })}>
    <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: "700" }}>{selected ? "✓ " : ""}{label}</Text>
    <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{observations} recorded {observations === 1 ? "day" : "days"}</Text>
  </Pressable>;
}

function RecordedScores({ points, asList }: { points: HistoryPoint[]; asList: boolean }) {
  if (asList) return <View testID="progress-history-score-list" style={{ gap: 8 }}>{points.map(point =>
    <View key={point.date} accessible accessibilityLabel={`${historyDateLabel(point.date)}: ${point.score} out of 100.`}
      style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>{historyDateLabel(point.date)}</Text>
      <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{point.score} / 100</Text>
    </View>)}</View>;

  return <View testID="progress-history-chart" accessible
    accessibilityLabel={`Recorded scores, zero to 100 scale. ${points.map(point => `${historyDateLabel(point.date)}: ${point.score}`).join(". ")}.`}
    style={{ gap: 8 }}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", gap: 8 }}>
      <View style={{ width: 27, paddingTop: 25 }}>
        <View style={{ height: 100, justifyContent: "space-between" }}>
          {[100, 50, 0].map(value => <Text key={value} style={{ color: colors.soft, fontSize: 11, lineHeight: 13 }}>{value}</Text>)}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ position: "absolute", left: 0, right: 0, top: 25, height: 100, justifyContent: "space-between" }}>
          {[100, 50, 0].map(value => <View key={value} style={{ height: 1, backgroundColor: value === 0 ? colors.lineStrong : colors.line }} />)}
        </View>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {points.map(point => <View key={point.date} style={{ flex: 1, gap: 6, alignItems: "center" }}>
            <Text style={{ color: colors.text, fontSize: 11, lineHeight: 19, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{point.score}</Text>
            <View style={{ height: 100, width: "100%", maxWidth: 30, justifyContent: "flex-end", alignItems: "center" }}>
              <View style={{ width: "100%", height: point.score, backgroundColor: colors.cyan, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              {point.score === 0 ? <View style={{ position: "absolute", bottom: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cyan }} /> : null}
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" }}>{historyDateLabel(point.date, false).replace(" ", "\n")}</Text>
          </View>)}
        </View>
      </View>
    </View>
  </View>;
}

export function ProgressHistoryCard({ history, showUpgrade, onUpgrade }: {
  history: ProgressHistory; showUpgrade: boolean; onUpgrade: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [preferList, setPreferList] = useState(false);
  const series = historySeries(history.points);
  const selected = series.find(item => item.skillId === selectedId) ?? series[0];
  const page = historyPage(selected?.points ?? [], pageIndex);
  const change = historyChange(page.points);
  const latest = selected?.points[selected.points.length - 1];
  const largeText = fontScale > 1.25 || width < 360;
  const asList = largeText || preferList || page.points.length === 1;
  const range = page.points.length > 1
    ? `${historyDateLabel(page.points[0].date)} to ${historyDateLabel(page.points[page.points.length - 1].date)}`
    : page.points[0] ? historyDateLabel(page.points[0].date) : "";

  return <Card>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
      <Eyebrow>Skill history</Eyebrow>
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{history.access === "full" ? "All available history" : `Recent ${history.windowDays ?? history.freeDays} days`}</Text>
    </View>
    {selected && latest ? <>
      <View accessibilityLiveRegion="polite" style={{ gap: 5 }}>
        <Title size={23}>{selected.skillName}</Title>
        <Body muted style={{ fontSize: 14, lineHeight: 21 }}>Latest score: {latest.score} / 100 · {historyDateLabel(latest.date)}</Body>
      </View>
      {series.length > 1 ? <HistoryButton testID="progress-history-skill-selector" label={choosing ? "Close skill choices" : `Change skill · ${series.length} available`}
        expanded={choosing} onPress={() => setChoosing(value => !value)} /> : null}
      {choosing ? <View accessibilityRole="radiogroup" accessibilityLabel="Choose a skill history" style={{ gap: 8 }}>
        {series.map(item => <HistorySkill key={item.skillId} id={item.skillId} label={item.skillName} observations={item.observations}
          selected={item.skillId === selected.skillId} onPress={() => { setSelectedId(item.skillId); setPageIndex(0); setChoosing(false); }} />)}
      </View> : null}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14, gap: 14 }}>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>{range}</Text>
        <RecordedScores points={page.points} asList={asList} />
        <Text accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: "600" }}>
          {change ? change.delta === 0 ? "Same score at the first and last recorded date shown."
            : `${change.delta > 0 ? "+" : ""}${change.delta} points between the first and last recorded date shown.`
            : selected.observations === 1 ? "One recorded day so far. A second date is needed to show change." : "This page contains one recorded day."}
        </Text>
        <Text style={{ color: colors.soft, fontSize: 12, lineHeight: 18 }}>Scores use a 0–100 scale. Dates are recorded in UTC.{!asList ? " Each bar is a recorded day; gaps between dates are not shown. A dot on the baseline marks a score of zero." : ""}</Text>
        {!largeText && page.points.length > 1 ? <HistoryButton testID="progress-history-table" label={preferList ? "Show chart" : "Show scores as a list"} onPress={() => setPreferList(value => !value)} /> : null}
        {page.pages > 1 ? <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <View style={{ flexGrow: 1, flexBasis: 120 }}><HistoryButton testID="progress-history-older" label="Earlier dates" disabled={!page.hasOlder} onPress={() => setPageIndex(page.page + 1)} /></View>
            <View style={{ flexGrow: 1, flexBasis: 120 }}><HistoryButton testID="progress-history-newer" label="More recent dates" disabled={!page.hasNewer} onPress={() => setPageIndex(page.page - 1)} /></View>
          </View>
          <Text style={{ color: colors.soft, fontSize: 12, lineHeight: 18 }}>Showing {page.points.length} of {selected.observations} recorded days. Page {page.pages - page.page} of {page.pages}.</Text>
        </> : null}
      </View>
    </> : <>
      <Title size={23}>Your history starts here</Title>
      <Body muted>No recorded days are available yet. Complete practice to start your history; scores on two different dates let you see a change.</Body>
    </>}
    {history.access === "limited" ? <Body muted style={{ fontSize: 14, lineHeight: 21 }}>Free includes the most recent {history.freeDays} days. Cogni Pro includes all available history.</Body> : null}
    {showUpgrade ? <PrimaryButton label="Unlock full progress history" onPress={onUpgrade} /> : null}
  </Card>;
}

export function ScoreExplainer() {
  const [expanded, setExpanded] = useState(false);
  return <Card>
    <HistoryButton testID="progress-scores-explainer" label={expanded ? "Hide score guide" : "How scores and evidence work"} expanded={expanded} onPress={() => setExpanded(value => !value)} />
    {expanded ? <>
      <Body muted>Your Development Score reflects performance in the questions Cogni has seen so far. The evidence label tells you how much observation sits behind that score.</Body>
      <Body muted>The recent average uses your latest available answers, up to 200. XP records earned activity. Neither is a population percentile or a permanent grade.</Body>
      <Body muted>Daily history shows the last recorded score for each day with activity, using UTC dates. Early score changes are a reason to keep learning, not a verdict on ability.</Body>
    </> : null}
  </Card>;
}
