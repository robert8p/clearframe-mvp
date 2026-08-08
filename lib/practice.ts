import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { audienceMatches, isAudienceSegment } from "@/lib/audience";
import type { Challenge } from "@/lib/types";

type PracticeSession = { id: string; challenges: Challenge[]; answeredChallengeIds: string[] };
const FIELDS = "id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context";

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

async function loadPractice(admin: ReturnType<typeof createAdminClient>, userId: string, sessionId: string): Promise<PracticeSession> {
  const [{ data: assignments }, { data: responses }] = await Promise.all([
    admin.from("practice_session_challenges").select("challenge_id,position").eq("session_id", sessionId).order("position"),
    admin.from("user_responses").select("challenge_id").eq("user_id", userId).eq("session_key", sessionId),
  ]);
  const ids: string[] = (assignments ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  const { data: challenges } = ids.length ? await admin.from("challenges").select(FIELDS).in("id", ids).eq("is_published", true) : { data: [] };
  const byId = new Map(((challenges ?? []) as Challenge[]).map((challenge) => [challenge.id, challenge]));
  return {
    id: sessionId,
    challenges: ids.map((id) => byId.get(id)).filter((value): value is Challenge => Boolean(value)),
    answeredChallengeIds: (responses ?? []).map((row: { challenge_id: string }) => row.challenge_id),
  };
}

export async function getOrCreatePracticeSession(supabase: SupabaseClient, userId: string, skillSlug: string, count = 3): Promise<PracticeSession | null> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: skill }] = await Promise.all([
    supabase.from("profiles").select("audience_segment").eq("id", userId).single(),
    supabase.from("skills").select("id,slug").eq("slug", skillSlug).single(),
  ]);
  if (!skill || !isAudienceSegment(profile?.audience_segment)) return null;
  const audience = profile.audience_segment;

  const { data: existing } = await admin
    .from("practice_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("skill_id", skill.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return loadPractice(admin, userId, existing.id);

  const [{ data: mappings }, { data: recent }] = await Promise.all([
    admin.from("challenge_skill_mapping").select("challenge_id").eq("skill_id", skill.id).limit(500),
    admin.from("user_responses").select("challenge_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
  ]);
  const mappedIds = (mappings ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  if (!mappedIds.length) return null;
  const { data: challengeRows } = await admin.from("challenges").select(FIELDS).in("id", mappedIds).eq("is_published", true).eq("is_diagnostic", false).limit(300);
  const eligible = ((challengeRows ?? []) as Challenge[]).filter((challenge) => audienceMatches(challenge.audience_segments, audience));
  const specific = eligible.filter((challenge) => challenge.audience_segments?.includes(audience));
  const pool = specific.length >= count ? specific : eligible;
  const recentIds = new Set((recent ?? []).map((row: { challenge_id: string }) => row.challenge_id));
  const fresh = pool.filter((challenge) => !recentIds.has(challenge.id));
  const candidates = (fresh.length >= count ? fresh : pool).sort((a, b) => hash(`${userId}:${skillSlug}:${a.id}`) - hash(`${userId}:${skillSlug}:${b.id}`));
  const picked = candidates.slice(0, count);
  if (!picked.length) return null;

  const { data: created, error } = await admin.from("practice_sessions").insert({ user_id: userId, skill_id: skill.id, status: "in_progress" }).select("id").single();
  if (error || !created?.id) throw error ?? new Error("Could not create practice session");
  await admin.from("practice_session_challenges").insert(picked.map((challenge, index) => ({ session_id: created.id, challenge_id: challenge.id, position: index + 1 })));
  return loadPractice(admin, userId, created.id);
}
