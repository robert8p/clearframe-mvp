import React from "react";
import { Stack } from "expo-router";
import { CogniMark } from "@/components/brand";
import { colors } from "@/lib/theme";

export default function TrainLayout() {
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg }, headerBackTitle: "Back", headerTitleStyle: { fontWeight: "800" }, headerRight: () => <CogniMark size={26} animated={false} /> }}><Stack.Screen name="index" options={{ title: "Train" }} /><Stack.Screen name="lesson" options={{ title: "Today’s insight" }} /><Stack.Screen name="session" options={{ title: "Training" }} /><Stack.Screen name="practice/[slug]" options={{ title: "Skill practice" }} /></Stack>;
}
