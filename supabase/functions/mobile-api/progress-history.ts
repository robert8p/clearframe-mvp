import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";
import { BillingUnavailableError, loadEntitlementState } from "./monetization.ts";

type SkillUpdateRow = {
  skill_id: string;
  score_after: number | string;
  reliability_after: number | string;
  attempts_after: number;
  created_at: string;
  skills: { slug: string; name: string } | { slug: string; name: string }[] | null;
};

function skillRelation(value: SkillUpdateRow["skills"]) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function localDay(iso: string) {
  return iso.slice(0, 10);
}

export async function progressHistory(admin: SupabaseClient, userId: string) {
  const state = await loadEntitlementState(admin, userId);
  if (state.config.monetizationEnabled && !state.stateReliable) throw new BillingUnavailableError("Cogni couldn't verify your progress-history access right now. Your current progress snapshot is still available.");

  const isFullHistory = !state.config.monetizationEnabled || state.isPro;
  const freeDays = Math.max(0, state.config.progressHistoryFreeDays);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (isFullHistory ? 365 : freeDays));

  const query = await admin
    .from("user_response_skill_updates")
    .select("skill_id,score_after,reliability_after,attempts_after,created_at,skills:skill_id(slug,name)")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);
  if (query.error) throw query.error;

  const rows = (query.data ?? []) as unknown as SkillUpdateRow[];
  const latestByDayAndSkill = new Map<string, SkillUpdateRow>();
  for (const row of rows) latestByDayAndSkill.set(`${localDay(row.created_at)}:${row.skill_id}`, row);

  const points = [...latestByDayAndSkill.values()].map((row) => {
    const skill = skillRelation(row.skills);
    return {
      date: localDay(row.created_at),
      skillId: row.skill_id,
      skillSlug: skill?.slug ?? null,
      skillName: skill?.name ?? "Skill",
      score: Math.round(Number(row.score_after) * 10) / 10,
      reliability: Math.round(Number(row.reliability_after) * 1000) / 1000,
      attempts: Number(row.attempts_after),
    };
  });

  return {
    access: isFullHistory ? "full" : "limited",
    freeDays,
    windowDays: isFullHistory ? 365 : freeDays,
    points,
  };
}
