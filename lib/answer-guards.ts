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
  const { error } = await supabase.rpc("award_xp_and_maybe_streak", {
    p_user_id: userId,
    p_xp_earned: xpEarned,
    p_completed_core_training: completedCoreTraining,
    p_today: localDateKey(),
    p_yesterday: previousLocalDateKey(),
  });
  if (error) throw error;
}
