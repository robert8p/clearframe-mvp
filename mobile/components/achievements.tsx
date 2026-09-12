import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Body, Card, Eyebrow, ProgressBar, SectionHeader } from "@/components/ui";
import { CogniIcon } from "@/components/visuals";
import { colors, glow, radius, typography } from "@/lib/theme";
import type { AchievementProgress, AchievementTone } from "@/lib/types";

const tonePalette: Record<AchievementTone, readonly [string, string, string]> = {
  common: ["rgba(37,99,235,.74)", "rgba(34,211,238,.45)", "rgba(15,23,42,.94)"],
  uncommon: ["rgba(20,184,166,.72)", "rgba(34,197,94,.32)", "rgba(15,23,42,.94)"],
  rare: ["rgba(139,92,246,.74)", "rgba(37,99,235,.38)", "rgba(15,23,42,.94)"],
  epic: ["rgba(245,158,11,.72)", "rgba(139,92,246,.42)", "rgba(15,23,42,.94)"],
  legendary: ["rgba(245,158,11,.76)", "rgba(37,99,235,.46)", "rgba(139,92,246,.38)"],
};

function toneText(tone: AchievementTone) {
  return tone === "legendary" ? "Legendary" : tone === "epic" ? "Epic" : tone === "rare" ? "Rare" : tone === "uncommon" ? "Uncommon" : "Common";
}

function AchievementMedallion({ achievement, compact }: { achievement: AchievementProgress; compact: boolean }) {
  const current = Math.max(0, Number(achievement.current) || 0);
  const target = Math.max(1, Number(achievement.target) || 1);
  const percent = achievement.unlocked ? 100 : Math.min(100, current / target * 100);
  const palette = achievement.unlocked ? tonePalette[achievement.tone] : ["rgba(71,85,105,.30)", "rgba(30,41,59,.34)", "rgba(15,23,42,.94)"] as const;
  const edge = achievement.unlocked ? achievement.tone === "epic" || achievement.tone === "legendary" ? "rgba(251,191,36,.46)" : "rgba(34,211,238,.34)" : colors.line;
  return (
    <LinearGradient
      accessible
      accessibilityLabel={`${achievement.name}. ${achievement.unlocked ? "Unlocked" : `${Math.min(current, target)} of ${target}`}. ${achievement.description}`}
      colors={palette}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flexBasis: compact ? "100%" : "45%", flexGrow: 1, minWidth: compact ? 0 : 148, minHeight: 176, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: edge, gap: 10, overflow: "hidden", boxShadow: achievement.unlocked ? achievement.tone === "epic" || achievement.tone === "legendary" ? glow.warm : glow.cyan : undefined }}
    >
      <LinearGradient pointerEvents="none" accessible={false} colors={["rgba(255,255,255,.07)", "transparent"]} style={{ position: "absolute", inset: 0 }} />
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 11 }}>
        <View style={{ width: 54, height: 54, borderRadius: 18, borderWidth: 1, borderColor: achievement.unlocked ? "rgba(255,255,255,.42)" : colors.lineStrong, backgroundColor: achievement.unlocked ? "rgba(8,16,38,.38)" : "rgba(8,16,38,.52)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "45deg" }] }}>
          <View style={{ transform: [{ rotate: "-45deg" }] }}><CogniIcon name={achievement.unlocked ? "spark" : "progress"} size={24} color={achievement.unlocked ? colors.white : colors.soft} /></View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Eyebrow style={{ color: achievement.unlocked ? colors.gold : colors.soft }}>{achievement.unlocked ? "Unlocked" : toneText(achievement.tone)}</Eyebrow>
          <Text style={{ color: colors.text, fontSize: 16.5, lineHeight: 22, ...typography.heading }}>{achievement.name}</Text>
        </View>
      </View>
      <Body muted style={{ fontSize: 13, lineHeight: 19 }}>{achievement.description}</Body>
      <View style={{ marginTop: "auto", gap: 7 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18, ...typography.body }}>Progress</Text>
          <Text style={{ color: achievement.unlocked ? colors.gold : colors.cyan, fontSize: 12.5, lineHeight: 18, ...typography.metric }}>{Math.min(current, target)} / {target}</Text>
        </View>
        <ProgressBar value={percent} />
      </View>
    </LinearGradient>
  );
}

export function AchievementShelf({ achievements = [], title = "Achievements" }: { achievements?: AchievementProgress[]; title?: string }) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 430 || fontScale > 1.24;
  const visible = achievements.slice(0, 8);
  const unlocked = visible.filter((achievement) => achievement.unlocked).length;
  return (
    <View style={{ gap: 12 }}>
      <SectionHeader title={title} />
      <Card variant="glass">
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>Milestones for a brighter you</Eyebrow>
            <Text style={{ color: colors.text, fontSize: 21, lineHeight: 27, ...typography.heading }}>{unlocked} of {visible.length || achievements.length} unlocked</Text>
          </View>
          <View style={{ minWidth: 48, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: unlocked ? "rgba(251,191,36,.42)" : colors.line, backgroundColor: unlocked ? "rgba(245,158,11,.12)" : "rgba(71,85,105,.16)", alignItems: "center", justifyContent: "center", boxShadow: unlocked ? glow.warm : undefined }}>
            <CogniIcon name="spark" size={22} color={unlocked ? colors.gold : colors.soft} />
          </View>
        </View>
        {visible.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {visible.map((achievement) => <AchievementMedallion key={achievement.slug} achievement={achievement} compact={compact} />)}
          </View>
        ) : (
          <Body muted>Your first lesson, answers and streak will light up achievements here.</Body>
        )}
      </Card>
    </View>
  );
}
