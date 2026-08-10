import React, { useCallback, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { apiFetch } from "@/lib/api";
import type { TodayResponse } from "@/lib/types";
import { ErrorState, LoadingState } from "@/components/ui";
import { QuestionRunner } from "@/components/question-runner";

export default function TrainingSessionScreen() {
  const [today, setToday] = useState<TodayResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { setToday(await apiFetch<TodayResponse>("/api/mobile/today")); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load questions."); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Loading your questions…" />; if (error || !today) return <ErrorState message={error || "Could not load questions."} onRetry={() => void load()} />; if (today.state === "onboarding") return <Redirect href="/onboarding" />; if (today.state === "lesson") return <Redirect href="/(tabs)/train/lesson" />; if (today.state === "complete") return <Redirect href="/(tabs)/train" />;
  if (today.state === "diagnostic" && today.sessionId && today.challenges?.length) return <QuestionRunner mode="diagnostic" sessionId={today.sessionId} challenges={today.challenges} answeredChallengeIds={today.answeredChallengeIds ?? []} modeLabel={today.modeLabel} onComplete={() => router.replace("/(tabs)/train")} />;
  if (today.state === "training" && today.session?.id && today.session.challenges.length) return <QuestionRunner mode="training" sessionId={today.session.id} challenges={today.session.challenges} answeredChallengeIds={today.session.answeredChallengeIds ?? []} modeLabel={today.modeLabel} onComplete={() => router.replace("/(tabs)/train")} />;
  return <ErrorState message="Cogni couldn’t find the right questions for this session." onRetry={() => void load()} />;
}
