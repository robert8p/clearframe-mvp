import React, { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { FormField } from "@/components/form-field";
import { RefreshNotice, SkillTile } from "@/components/learning-surfaces";
import { ActionLink, Body, EditorialPanel, ErrorState, HeroPanel, LoadingState, Screen, SectionHeader, Title } from "@/components/ui";
import { CogniMark } from "@/components/brand";
import { SkillMotif } from "@/components/visuals";
import { apiFetch } from "@/lib/api";
import { selectSkills, skillDetails } from "@/lib/learning-view";
import { useProGate } from "@/lib/pro-gate";
import { useFocusResource } from "@/lib/use-focus-resource";
import { colors, glow, radius, typography } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";

const loadSkills = (signal: AbortSignal) => apiFetch<MobileProfileResponse>("/api/mobile/profile", { signal });
const filters = [{ id: "all", label: "All topics" }, { id: "practised", label: "In progress" }, { id: "new", label: "New" }] as const;

export default function SkillsScreen() {
  const { data, loading, refreshing, error, reload } = useFocusResource(loadSkills);
  const { needsProForFocusedPractice, openFocusedPractice } = useProGate();
  const [query, setQuery] = useState(""); const [filter, setFilter] = useState<"all" | "practised" | "new">("all");
  if (loading) return <LoadingState />;
  if (!data) return <ErrorState message={error || "Could not load topics."} onRetry={() => void reload()} />;
  if (!data.profile.audience_segment) return <Redirect href="/onboarding" />;
  const rows = selectSkills(data.skillScores, query, filter);

  return <Screen refreshing={refreshing} onRefresh={() => void reload()}>
    <HeroPanel eyebrow="Discovery / library" title="Discover" body="Explore a universe of thinking topics. Cogni adapts what you see to your goals, progress and recent practice." minHeight={0} renderArtwork={(size) => <CogniMark size={size} />} footer={<View pointerEvents="none" accessible={false} style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}><SkillMotif kind="reasoning" size={38} /><SkillMotif kind="perspective" size={38} /><SkillMotif kind="growth" size={38} /></View>} />

    {error ? <RefreshNotice message={error} onRetry={() => void reload()} /> : null}
    <FormField label="Search topics" accessibilityLabel="Search topics" placeholder="Try evidence, reasoning or AI" placeholderTextColor={colors.soft} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />

    <View accessibilityRole="radiogroup" accessibilityLabel="Filter topics" style={{ flexDirection: "row", padding: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(15,23,42,.82)", gap: 4 }}>
      {filters.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: filter === item.id }} onPress={() => setFilter(item.id)} style={({ pressed }) => ({ flex: 1, minHeight: 48, paddingVertical: 11, paddingHorizontal: 8, borderRadius: 14, borderWidth: filter === item.id ? 1 : 0, borderColor: filter === item.id ? "rgba(34,211,238,.40)" : "transparent", backgroundColor: filter === item.id ? "rgba(37,99,235,.28)" : "transparent", opacity: pressed ? .8 : 1, alignItems: "center", justifyContent: "center", boxShadow: filter === item.id ? glow.cyan : undefined })}><Text style={{ color: filter === item.id ? colors.text : colors.muted, fontSize: 13.5, lineHeight: 19, ...typography.label }}>{item.label}</Text></Pressable>)}
    </View>

    <SectionHeader title={`${rows.length} ${rows.length === 1 ? "topic" : "topics"}`} />
    {needsProForFocusedPractice ? <Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18, ...typography.body }}>Focused topic practice is a Cogni Pro feature. Your daily core practice remains available.</Text> : null}
    <View style={{ gap: 11 }}>{rows.map(row => <SkillTile key={row.skill_id} row={row} pro={needsProForFocusedPractice} onPress={() => { const slug = skillDetails(row)?.slug; if (slug) openFocusedPractice(slug, "discover_map"); }} />)}</View>

    {!rows.length ? <EditorialPanel><View style={{ alignSelf: "center", padding: 12 }}><CogniMark size={86} animated={false} /></View><Title size={22}>{data.skillScores.length ? "No topics match yet" : "Your map starts here"}</Title><Body muted>{data.skillScores.length ? "Try a broader search or switch to All topics." : "Complete the starting check to begin your personal topic map."}</Body>{data.skillScores.length ? <ActionLink label="Reset filters" onPress={() => { setQuery(""); setFilter("all"); }} /> : <ActionLink label="Go to Train" onPress={() => router.navigate("/(tabs)/train")} />}</EditorialPanel> : null}
    <Body muted style={{ fontSize: 12.5, lineHeight: 19 }}>Evidence describes the practice behind a score. It is not a formal assessment or a statistical confidence rating.</Body>
  </Screen>;
}
