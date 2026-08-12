import React from "react";
import { Stack } from "expo-router";
import { useReducedMotion } from "@/lib/accessibility";
import { colors } from "@/lib/theme";

export default function TrainLayout() {
  const reducedMotion = useReducedMotion();
  return <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg }, headerBackTitle: "Back", headerTitleStyle: { fontWeight: "700" }, animation: reducedMotion ? "none" : "default" }}><Stack.Screen name="index" options={{ title: "Train" }} /><Stack.Screen name="lesson" options={{ title: "Today’s insight" }} /><Stack.Screen name="session" options={{ title: "Training" }} /><Stack.Screen name="practice/[slug]" options={{ title: "Skill practice" }} /></Stack>;
}
