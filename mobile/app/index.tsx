import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { CogniOrb } from "@/components/orb";
import { Body, Eyebrow, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function WelcomeScreen() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (session) return <Redirect href="/(tabs)/home" />;
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", gap: 18 }}>
    <CogniOrb size={174} />
    <View style={{ alignItems: "center", gap: 8 }}><Eyebrow>Daily practice for sharper thinking</Eyebrow><Title size={42}>Cogni</Title><Body muted style={{ textAlign: "center", maxWidth: 330 }}>Think more clearly, judge evidence better and know when to challenge AI.</Body></View>
    <View style={{ width: "100%", gap: 10, marginTop: 6 }}><PrimaryButton label="Get started" onPress={() => router.push("/signup")} /><PrimaryButton label="Sign in" secondary onPress={() => router.push("/login")} /></View>
    <Text style={{ color: colors.soft, fontSize: 13, textAlign: "center" }}>Your scores and learning history stay synced with Cogni on the web.</Text>
  </Screen>;
}
