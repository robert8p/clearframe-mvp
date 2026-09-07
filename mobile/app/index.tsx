import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { CogniLogo } from "@/components/brand";
import { Body, Card, Eyebrow, LoadingState, PrimaryButton, Screen, Title, ActionLink } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import appConfig from "../app.json";

export default function WelcomeScreen() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (session) return <Redirect href="/(tabs)/home" />;
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", gap: 22 }}>
    <View style={{ gap: 22, paddingTop: 16 }}><CogniLogo animated={false} /><View style={{ gap: 12 }}><Eyebrow>Thinking practice for real life</Eyebrow><Title size={36}>Make room for a clearer perspective.</Title><Body muted>Practise spotting assumptions, weighing evidence and knowing when to question AI.</Body></View></View>
    <Card style={{ backgroundColor: "#152437", borderColor: "rgba(99,218,205,.42)", gap: 12 }}><Eyebrow>A question to start with</Eyebrow><Title size={24}>It sounds convincing. But what makes it true?</Title><Body muted style={{ fontSize: 15, lineHeight: 23 }}>Try three sample decisions and explore the reasoning. No account, timer or score.</Body><PrimaryButton label="Try a sample decision" trailingArrow onPress={() => router.push("/demo")} /></Card>
    <View style={{ gap: 12 }}><PrimaryButton label="Get started" secondary onPress={() => router.push("/signup")} /><ActionLink label="I already have an account" onPress={() => router.push("/login")} /></View>
    <View style={{ gap: 8 }}><Body muted style={{ textAlign: "center", fontSize: 13, lineHeight: 20 }}>Your context. Varied practice. Ideas worth keeping.</Body><Text selectable style={{ color: colors.soft, fontSize: 12, lineHeight: 18, textAlign: "center" }}>Cogni {appConfig.expo.version} · Free test preview · Curated content</Text></View>
  </Screen>;
}
