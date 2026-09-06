import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { EntitlementProvider } from "@/lib/entitlements";
import { FeedbackProvider } from "@/lib/feedback";
import { useReducedMotion } from "@/lib/accessibility";
import { SplashScreenController } from "@/components/splash-screen-controller";
import { StartupConfigurationScreen } from "@/components/startup-configuration-screen";
import { StartupErrorBoundary } from "@/components/startup-error-boundary";
import { LoadingState } from "@/components/ui";
import { RUNTIME_CONFIGURATION_ERROR } from "@/lib/supabase";
import { colors } from "@/lib/theme";

// Keep the signed-out welcome route as the stack anchor for normal launches and
// for deep links. Protected routes then fall back to the first valid route for
// the current authentication state instead of an unrelated recovery screen.
export const unstable_settings = {
  initialRouteName: "index",
};

function RootNavigator() {
  const { session, loading } = useAuth();
  const reducedMotion = useReducedMotion();

  // Do not construct protected route availability until the persisted session
  // and any incoming auth deep link have both been resolved.
  if (loading) return <LoadingState label="Opening Cogni…" />;

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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/confirm" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: "Your learning context" }} />
        <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="support" options={{ title: "Cogni Support" }} />
      </Stack.Protected>

      {/* A valid recovery link creates a temporary authenticated session. Keep
          this route available while auth is resolving and when a link expires. */}
      <Stack.Screen name="auth/recovery" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  if (RUNTIME_CONFIGURATION_ERROR) {
    return (
      <>
        <StatusBar style="light" />
        <StartupConfigurationScreen message={RUNTIME_CONFIGURATION_ERROR} />
      </>
    );
  }

  return (
    <StartupErrorBoundary>
      <AuthProvider>
        <EntitlementProvider>
          <FeedbackProvider>
            <SplashScreenController />
            <StatusBar style="light" />
            <RootNavigator />
          </FeedbackProvider>
        </EntitlementProvider>
      </AuthProvider>
    </StartupErrorBoundary>
  );
}
