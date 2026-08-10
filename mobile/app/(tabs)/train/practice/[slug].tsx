import React, { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { apiFetch } from "@/lib/api";
import type { Challenge } from "@/lib/types";
import { ErrorState, LoadingState } from "@/components/ui";
import { QuestionRunner } from "@/components/question-runner";

type PracticePayload = { skill: { name: string; slug: string }; session: { id: string; challenges: Challenge[]; answeredChallengeIds: string[] }; modeLabel: string };

export default function PracticeScreen() {
  const params = useLocalSearchParams<{ slug: string }>(); const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const [data, setData] = useState<PracticePayload | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { if (!slug) { setError("Skill not found."); setLoading(false); return; } setLoading(true); setError(""); try { setData(await apiFetch<PracticePayload>(`/api/mobile/practice/${encodeURIComponent(slug)}`)); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load practice."); } finally { setLoading(false); } }, [slug]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (loading) return <LoadingState label="Preparing skill practice…" />; if (error || !data) return <ErrorState message={error || "Could not load practice."} onRetry={() => void load()} />;
  return <QuestionRunner mode="practice" sessionId={data.session.id} challenges={data.session.challenges} answeredChallengeIds={data.session.answeredChallengeIds} modeLabel={data.modeLabel} onComplete={() => router.replace("/(tabs)/skills")} />;
}
