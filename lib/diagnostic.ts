import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DiagnosticResponse = {
  challenge_id: string;
  session_key: string | null;
  created_at: string;
};

type SessionGroup = {
  sessionKey: string;
  answeredChallengeIds: string[];
  latestAt: string;
};

export type DiagnosticProgress = {
  challengeIds: string[];
  challengeCount: number;
  completedSessionKey: string | null;
  resumableSessionKey: string | null;
  answeredChallengeIds: string[];
};

export async function getDiagnosticProgress(
  supabase: SupabaseClient,
  userId: string,
  knownChallengeIds?: string[],
): Promise<DiagnosticProgress> {
  let challengeIds = knownChallengeIds ?? [];

  if (!knownChallengeIds) {
    const { data, error } = await supabase
      .from("challenges")
      .select("id")
      .eq("is_published", true)
      .eq("is_diagnostic", true)
      .order("sort_order");
    if (error) throw error;
    challengeIds = (data ?? []).map((row: { id: string }) => row.id);
  }

  if (!challengeIds.length) {
    return { challengeIds, challengeCount: 0, completedSessionKey: null, resumableSessionKey: null, answeredChallengeIds: [] };
  }

  const { data, error } = await supabase
    .from("user_responses")
    .select("challenge_id,session_key,created_at")
    .eq("user_id", userId)
    .in("challenge_id", challengeIds)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const currentIds = new Set(challengeIds);
  const grouped = new Map<string, { answered: Set<string>; latestAt: string }>();
  for (const row of (data ?? []) as DiagnosticResponse[]) {
    const key = String(row.session_key ?? "");
    if (!UUID_RE.test(key) || !currentIds.has(row.challenge_id)) continue;
    const existing = grouped.get(key) ?? { answered: new Set<string>(), latestAt: row.created_at };
    existing.answered.add(row.challenge_id);
    if (row.created_at > existing.latestAt) existing.latestAt = row.created_at;
    grouped.set(key, existing);
  }

  const sessions: SessionGroup[] = [...grouped.entries()]
    .map(([sessionKey, value]) => ({ sessionKey, answeredChallengeIds: [...value.answered], latestAt: value.latestAt }))
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt));

  const completed = sessions.find((session) => session.answeredChallengeIds.length >= challengeIds.length) ?? null;
  if (completed) {
    return {
      challengeIds,
      challengeCount: challengeIds.length,
      completedSessionKey: completed.sessionKey,
      resumableSessionKey: null,
      answeredChallengeIds: completed.answeredChallengeIds,
    };
  }

  const partial = sessions.find((session) => session.answeredChallengeIds.length > 0) ?? null;
  return {
    challengeIds,
    challengeCount: challengeIds.length,
    completedSessionKey: null,
    resumableSessionKey: partial?.sessionKey ?? null,
    answeredChallengeIds: partial?.answeredChallengeIds ?? [],
  };
}
