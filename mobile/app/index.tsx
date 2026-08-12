import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { CogniOrb } from "@/components/orb";
import { Body, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
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
    <View style={{ alignItems: "center", gap: 12 }}><CogniLogo centered /><CogniOrb size={168} /><View style={{ alignItems: "center", gap: 7 }}><Title size={30}>Learn smarter. Think deeper.</Title><Text style={{ color: colors.purple, fontSize: 20, lineHeight: 26, fontWeight: "900", textAlign: "center" }}>Achieve more.</Text><Body muted style={{ textAlign: "center", maxWidth: 338 }}>Daily practice that strengthens judgement, critical thinking and the way you work with AI.</Body></View></View>
    <View accessible={false} style={{ gap: 0 }}>{features.map(([icon, title, body], index) => <View accessible accessibilityLabel={`${title}. ${body}`} key={title} style={{ minHeight: 72, flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 11, borderBottomWidth: index === features.length - 1 ? 0 : 1, borderBottomColor: colors.line }}><Text accessible={false} style={{ width: 30, color: colors.cyan, fontSize: icon === "AI" ? 14 : 18, lineHeight: 24, fontWeight: "900", textAlign: "center" }}>{icon}</Text><View style={{ flex: 1, gap: 3 }}><Text style={{ color: colors.text, fontWeight: "900", fontSize: 15.5, lineHeight: 21 }}>{title}</Text><Text style={{ color: colors.muted, fontSize: 13.5, lineHeight: 19 }}>{body}</Text></View></View>)}</View>
    <View style={{ width: "100%", gap: 10, marginTop: 4 }}><PrimaryButton label="Get started" onPress={() => router.push("/signup")} /><PrimaryButton label="I already have an account" secondary onPress={() => router.push("/login")} /></View>
  </Screen>;
}
