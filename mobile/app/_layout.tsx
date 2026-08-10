import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  return <AuthProvider><StatusBar style="light" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.bg }, headerTitleStyle: { fontWeight: "700" } }}><Stack.Screen name="index" options={{ headerShown: false }} /><Stack.Screen name="login" options={{ title: "Sign in", presentation: "modal" }} /><Stack.Screen name="signup" options={{ title: "Create account", presentation: "modal" }} /><Stack.Screen name="onboarding" options={{ title: "Your learning context" }} /><Stack.Screen name="(tabs)" options={{ headerShown: false }} /></Stack></AuthProvider>;
}
