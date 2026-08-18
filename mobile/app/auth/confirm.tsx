import React from "react";
import { Redirect, router } from "expo-router";
import { Body, Card, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function ConfirmEmailScreen() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState label="Confirming your Cogni account…" />;
  if (session) return <Redirect href="/onboarding" />;
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}><Card><Title size={28}>We couldn’t confirm that link</Title><Body muted>The link may have expired or already been used. Try signing in, or create a fresh account confirmation if needed.</Body><PrimaryButton label="Go to sign in" onPress={() => router.replace("/login")} /></Card></Screen>;
}
