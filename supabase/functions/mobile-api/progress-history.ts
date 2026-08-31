import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";
import { BillingUnavailableError, loadEntitlementState } from "./monetization.ts";

type DailySkillPoint = {
  day: string;
  skill_id: string;
  skill_slug: string | null;
  skill_name: string;
  score: number | string;
  reliability: number | string;
  attempts: number;
};

export async function progressHistory(admin: SupabaseClient, userId: string) {
  const state = await loadEntitlementState(admin, userId);
  if (state.config.monetizationEnabled && !state.stateReliable) {
    throw new BillingUnavailableError("Cogni couldn't verify your progress-history access right now. Your current progress snapshot is still available.");
  }

  const isFullHistory = !state.config.monetizationEnabled || state.isPro;
  const freeDays = Math.max(0, state.config.progressHistoryFreeDays);
  const since = new Date();
  if (!isFullHistory) since.setUTCDate(since.getUTCDate() - freeDays);

  const query = await admin.rpc("get_user_skill_progress_history", {
    p_user_id: userId,
    p_since: isFullHistory ? null : since.toISOString(),
  });
  if (query.error) throw query.error;

  const rows = (query.data ?? []) as unknown as DailySkillPoint[];
  const points = rows.map((row) => ({
    date: row.day,
    skillId: row.skill_id,
    skillSlug: row.skill_slug,
    skillName: row.skill_name || "Skill",
    score: Math.round(Number(row.score) * 10) / 10,
    reliability: Math.round(Number(row.reliability) * 1000) / 1000,
    attempts: Number(row.attempts),
  }));

  return {
    access: isFullHistory ? "full" : "limited",
    freeDays,
    windowDays: isFullHistory ? null : freeDays,
    availableFrom: points[0]?.date ?? null,
    availableTo: points[points.length - 1]?.date ?? null,
    points,
  };
}
