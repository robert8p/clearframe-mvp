import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { CogniOrb } from "@/components/orb";
import { Body, LoadingState, PrimaryButton, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

const features = [
  ["✦", "Sharper thinking", "Practice judgement, evidence and uncertainty."],
  ["AI", "Smarter AI use", "Know when to trust, test and challenge AI."],
  ["▥", "Visible progress", "Build a profile from the decisions you make."],
  ["🔥", "Daily momentum", "Short sessions designed to become a habit."],
] as const;

export default function WelcomeScreen() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (session) return <Redirect href="/(tabs)/home" />;
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 18 }}>
    <View style={{ alignItems: "center", gap: 12 }}><CogniLogo centered /><CogniOrb size={174} /><View style={{ alignItems: "center", gap: 7 }}><Text style={{ color: colors.text, fontSize: 29, lineHeight: 35, fontWeight: "900", textAlign: "center", letterSpacing: -.8 }}>Learn smarter. Think deeper.</Text><Text style={{ color: colors.purple, fontSize: 20, fontWeight: "900" }}>Achieve more.</Text><Body muted style={{ textAlign: "center", maxWidth: 338 }}>Daily practice that strengthens judgement, critical thinking and the way you work with AI.</Body></View></View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{features.map(([icon, title, body]) => <View key={title} style={{ width: "48%", minHeight: 116, borderRadius: 21, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(16,23,53,.9)", padding: 14, gap: 7 }}><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: "rgba(107,92,255,.16)", alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.cyan, fontWeight: "900" }}>{icon}</Text></View><Text style={{ color: colors.text, fontWeight: "900", fontSize: 14.5 }}>{title}</Text><Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18 }}>{body}</Text></View>)}</View>
    <View style={{ width: "100%", gap: 10, marginTop: 4 }}><PrimaryButton label="Get started" onPress={() => router.push("/signup")} /><PrimaryButton label="I already have an account" secondary onPress={() => router.push("/login")} /></View>
  </Screen>;
}
