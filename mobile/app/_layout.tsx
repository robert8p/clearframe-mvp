import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useReducedMotion } from "@/lib/accessibility";
import { SplashScreenController } from "@/components/splash-screen-controller";
import { colors } from "@/lib/theme";

function RootNavigator() {
  const { session } = useAuth();
  const reducedMotion = useReducedMotion();
  const signedIn = Boolean(session);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontWeight: "700" },
        animation: reducedMotion ? "none" : "default",
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ title: "Sign in", presentation: "modal" }} />
        <Stack.Screen name="signup" options={{ title: "Create account", presentation: "modal" }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: "Your learning context" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashScreenController />
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
