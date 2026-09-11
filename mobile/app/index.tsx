import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CogniLogo, CogniMark } from "@/components/brand";
import { HeroArtwork, SkillMotif } from "@/components/visuals";
import { ActionLink, Body, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, glow, radius, typography } from "@/lib/theme";
import appConfig from "../app.json";

export default function WelcomeScreen() {
  const { session, loading } = useAuth(); const insets = useSafeAreaInsets(); const { fontScale, width } = useWindowDimensions();
  if (loading) return <LoadingState />;
  if (session) return <Redirect href="/(tabs)/home" />;
  const mediaHeight = fontScale > 1.35 ? 230 : width < 360 ? 264 : 306;

  return <Screen atmospheric={false} contentStyle={{ gap: 16, paddingTop: Math.max(insets.top, 8) }}>
    <View style={{ marginHorizontal: -20, borderBottomLeftRadius: radius.xxl, borderBottomRightRadius: radius.xxl, overflow: "hidden", backgroundColor: colors.bgDeep, boxShadow: glow.hero }}>
      <View pointerEvents="none" accessible={false} style={{ height: mediaHeight, overflow: "hidden", backgroundColor: colors.bgDeep }}>
        <HeroArtwork height={mediaHeight} />
        <LinearGradient colors={["rgba(5,10,24,.08)", "rgba(8,16,38,.10)", "#081026"]} locations={[0, .56, 1]} style={{ position: "absolute", inset: 0 }} />
        <LinearGradient colors={["rgba(37,99,235,.22)", "transparent", "rgba(139,92,246,.10)"]} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ position: "absolute", inset: 0 }} />
        <View style={{ position: "absolute", alignSelf: "center", top: Math.max(36, mediaHeight * .24), opacity: .95 }}><CogniMark size={fontScale > 1.35 ? 132 : 166} /></View>
      </View>
      <View style={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 22, gap: 10 }}>
        <CogniLogo animated={false} />
        <Text style={{ color: "rgba(248,250,252,.82)", fontSize: 12.5, lineHeight: 19, ...typography.eyebrow, textTransform: "uppercase" }}>Knowledge moves you</Text>
        <Title size={fontScale > 1.35 ? 34 : 40}>Sharpen how you think.</Title>
        <Body style={{ maxWidth: 520, fontSize: 17, lineHeight: 25 }}>Real-life thinking practice for a calmer, clearer, more capable you.</Body>
        <Text style={{ color: colors.cyan, fontSize: 12.5, lineHeight: 19, ...typography.eyebrow, textTransform: "uppercase" }}>A brighter you, by design.</Text>
      </View>
    </View>

    <View style={{ gap: 10 }}><PrimaryButton label="Get started" trailingArrow onPress={() => router.push("/signup")} /><PrimaryButton secondary label="Try a sample decision" accessibilityHint="Explore three sample decisions, with no account or score" onPress={() => router.push("/demo")} /><ActionLink label="I already have an account" onPress={() => router.push("/login")} /></View>

    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 8 }}>{([{ kind: "reasoning", label: "Think clearly" }, { kind: "perspective", label: "See another angle" }, { kind: "growth", label: "Grow by practice" }] as const).map(item => <View key={item.kind} style={{ flex: 1, alignItems: "center", gap: 8 }}><SkillMotif kind={item.kind} size={44} /><Text style={{ color: colors.muted, textAlign: "center", fontSize: 12, lineHeight: 18, ...typography.bodyMedium }}>{item.label}</Text></View>)}</View>
    <Text selectable style={{ color: colors.faint, fontSize: 11.5, lineHeight: 17, textAlign: "center", ...typography.body }}>Cogni {appConfig.expo.version} · Free test preview · Curated content</Text>
  </Screen>;
}
