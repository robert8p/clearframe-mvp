import type { SupabaseClient } from "@supabase/supabase-js";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import { localDateKey, previousLocalDateKey } from "@/lib/dates";

export type DiagnosticGuardResult =
  | { ok: true }
  | { ok: false; status: 403 | 409; error: string };

export async function guardDiagnosticSubmission(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  challengeId: string,
): Promise<DiagnosticGuardResult> {
  const progress = await getDiagnosticProgress(supabase, userId);

  if (progress.completedSessionKey) {
    return { ok: false, status: 409, error: "Your starting check is already complete." };
  }

  if (!progress.challengeIds.includes(challengeId)) {
    return { ok: false, status: 403, error: "This challenge is not assigned to your starting check." };
  }

  if (progress.resumableSessionKey && progress.resumableSessionKey !== sessionId) {
    return { ok: false, status: 409, error: "Continue the starting check you already began." };
  }

  if (progress.answeredChallengeIds.includes(challengeId)) {
    return { ok: false, status: 409, error: "This starting-check challenge has already been submitted." };
  }

  return { ok: true };
}

export async function awardXpAndMaybeDailyStreak(
  supabase: SupabaseClient,
  userId: string,
  xpEarned: number,
  completedCoreTraining: boolean,
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("xp,current_streak,last_session_date")
    .eq("id", userId)
    .single();
  if (error) throw error;

  const updates: Record<string, unknown> = {
    xp: Number(profile?.xp ?? 0) + xpEarned,
  };

  if (completedCoreTraining) {
    const today = localDateKey();
    if (profile?.last_session_date !== today) {
      const yesterday = previousLocalDateKey();
      updates.current_streak = profile?.last_session_date === yesterday
        ? Number(profile?.current_streak ?? 0) + 1
        : 1;
      updates.last_session_date = today;
    }
  }

  const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (updateError) throw updateError;
}
