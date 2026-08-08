import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { audienceMatches, isAudienceSegment } from "@/lib/audience";
import type { Challenge } from "@/lib/types";

type PracticeSession = { id: string; challenges: Challenge[]; answeredChallengeIds: string[] };
const FIELDS = "id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context";

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) { value ^= text.charCodeAt(index); value = Math.imul(value, 16777619); }
  return value >>> 0;
}
function promptKey(value: string) { return value.trim().toLowerCase().replace(/\s+/g, " "); }

async function loadPractice(admin: ReturnType<typeof createAdminClient>, userId: string, sessionId: string): Promise<PracticeSession> {
  const [{ data: assignments, error: assignmentError }, { data: responses, error: responseError }] = await Promise.all([
    admin.from("practice_session_challenges").select("challenge_id,position").eq("session_id", sessionId).order("position"),
    admin.from("user_responses").select("challenge_id").eq("user_id", userId).eq("session_key", sessionId),
  ]);
  if (assignmentError) throw assignmentError;
  if (responseError) throw responseError;
  const ids: string[] = (assignments ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  const { data: challenges, error } = ids.length ? await admin.from("challenges").select(FIELDS).in("id", ids).eq("is_published", true) : { data: [], error: null };
  if (error) throw error;
  const byId = new Map(((challenges ?? []) as Challenge[]).map((challenge) => [challenge.id, challenge]));
  return { id: sessionId, challenges: ids.map((id) => byId.get(id)).filter((value): value is Challenge => Boolean(value)), answeredChallengeIds: (responses ?? []).map((row: { challenge_id: string }) => row.challenge_id) };
}

export async function getOrCreatePracticeSession(supabase: SupabaseClient, userId: string, skillSlug: string, count = 3): Promise<PracticeSession | null> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: skill }] = await Promise.all([
    supabase.from("profiles").select("audience_segment").eq("id", userId).single(),
    supabase.from("skills").select("id,slug").eq("slug", skillSlug).single(),
  ]);
  if (!skill || !isAudienceSegment(profile?.audience_segment)) return null;
  const audience = profile.audience_segment;

  const { data: existing } = await admin.from("practice_sessions").select("id").eq("user_id", userId).eq("skill_id", skill.id).eq("status", "in_progress").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) return loadPractice(admin, userId, existing.id);

  const [{ data: mappings }, { data: recent }] = await Promise.all([
    admin.from("challenge_skill_mapping").select("challenge_id").eq("skill_id", skill.id).limit(500),
    admin.from("user_responses").select("challenge_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
  ]);
  const mappedIds = (mappings ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  if (!mappedIds.length) return null;

  const { data: challengeRows, error: challengeError } = await admin.from("challenges").select(FIELDS).in("id", mappedIds).eq("is_published", true).eq("is_diagnostic", false).limit(300);
  if (challengeError) throw challengeError;
  const all = (challengeRows ?? []) as Challenge[];
  const recentIds = new Set((recent ?? []).map((row: { challenge_id: string }) => row.challenge_id));
  const promptById = new Map(all.map((challenge) => [challenge.id, promptKey(challenge.prompt)]));
  const recentPrompts = new Set<string>();
  for (const id of recentIds) {
    const key = promptById.get(id);
    if (key) recentPrompts.add(key);
  }

  const eligible = all.filter((challenge) => audienceMatches(challenge.audience_segments, audience));
  const audienceSpecific = eligible.filter((challenge) => challenge.audience_segments?.includes(audience));
  const basePool = audienceSpecific.length >= count ? audienceSpecific : eligible;
  const fresh = basePool.filter((challenge) => !recentIds.has(challenge.id) && !recentPrompts.has(promptKey(challenge.prompt)));
  const candidates = [...(fresh.length >= count ? fresh : basePool)].sort((a, b) => {
    const recentA = recentPrompts.has(promptKey(a.prompt)) ? 1 : 0;
    const recentB = recentPrompts.has(promptKey(b.prompt)) ? 1 : 0;
    return recentA - recentB || hash(`${userId}:${skillSlug}:${a.id}`) - hash(`${userId}:${skillSlug}:${b.id}`);
  });

  const picked: Challenge[] = [];
  const usedPrompts = new Set<string>();
  for (const challenge of candidates) {
    const key = promptKey(challenge.prompt);
    if (usedPrompts.has(key)) continue;
    usedPrompts.add(key);
    picked.push(challenge);
    if (picked.length >= count) break;
  }
  if (!picked.length) return null;

  const { data: created, error } = await admin.from("practice_sessions").insert({ user_id: userId, skill_id: skill.id, status: "in_progress" }).select("id").single();
  if (error || !created?.id) throw error ?? new Error("Could not create practice session");
  const { error: assignmentError } = await admin.from("practice_session_challenges").insert(picked.map((challenge, index) => ({ session_id: created.id, challenge_id: challenge.id, position: index + 1 })));
  if (assignmentError) {
    await admin.from("practice_sessions").delete().eq("id", created.id);
    throw assignmentError;
  }
  return loadPractice(admin, userId, created.id);
}
