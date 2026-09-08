import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";

export type ContentMode = "training" | "practice" | "diagnostic";
type JsonObject = Record<string, unknown>;
export type ContentSnapshot = { challenge_id: string; challenge: JsonObject; answer_key: JsonObject };
const PUBLIC_FIELDS = "id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context,scenario_category,function_tags,industry_tags,goal_tags,complexity_level,is_diagnostic,diagnostic_role,sort_order".split(",");
const CONFIG_FIELDS = new Set(["instructions", "categories", "requiredSelections", "display", "contentVersion"]);
function object(value: unknown): value is JsonObject { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }

export function validateContentSnapshots(value: unknown, ids: readonly string[]): ContentSnapshot[] {
  if (!Array.isArray(value)) throw new Error("Session content is unavailable.");
  const expected = new Set(ids), found = new Set<string>();
  for (const row of value) {
    if (!object(row) || typeof row.challenge_id !== "string" || !expected.has(row.challenge_id) || found.has(row.challenge_id) || !object(row.challenge) || !object(row.answer_key)) throw new Error("Invalid session content.");
    if (row.challenge.id !== row.challenge_id || row.answer_key.challenge_id !== row.challenge_id || !Array.isArray(row.challenge.options) || !row.challenge.options.every((option) => typeof option === "string") || typeof row.challenge.prompt !== "string" || typeof row.answer_key.explanation !== "string") throw new Error("Question and answer snapshot do not match.");
    found.add(row.challenge_id);
  }
  if (found.size !== expected.size) throw new Error("Not all assigned questions could be loaded.");
  return value as ContentSnapshot[];
}

// Only whitelisted question fields leave the backend. The RPC also returns a key for grading,
// but it must NEVER be spread into the response or nested inside interaction_config.
export function publicSessionQuestion(snapshot: ContentSnapshot): JsonObject {
  const result: JsonObject = {};
  for (const field of PUBLIC_FIELDS) if (Object.hasOwn(snapshot.challenge, field)) result[field] = snapshot.challenge[field];
  if (object(result.interaction_config)) {
    result.interaction_config = Object.fromEntries(Object.entries(result.interaction_config).filter(([key]) => CONFIG_FIELDS.has(key)));
  }
  return result;
}

async function readSnapshots(admin: SupabaseClient, userId: string, sessionId: string, ids: readonly string[], mode: ContentMode, legacyIfMissing: boolean): Promise<ContentSnapshot[]> {
  if (!ids.length) return [];
  const { data, error } = await admin.rpc("cogni_session_content_v1", {
    p_user_id: userId, p_session_id: sessionId, p_challenge_ids: [...ids], p_mode: mode, p_legacy_if_missing: legacyIfMissing,
  });
  if (error) throw error;
  return validateContentSnapshots(data, ids);
}

export async function loadSessionQuestions(admin: SupabaseClient, userId: string, sessionId: string, ids: readonly string[], mode: ContentMode): Promise<JsonObject[]> {
  const rows = await readSnapshots(admin, userId, sessionId, ids, mode, false);
  const byId = new Map(rows.map((row) => [row.challenge_id, row]));
  return ids.map((id) => publicSessionQuestion(byId.get(id)!));
}

type GradingChallenge = { id: string; prompt: string; difficulty: number; is_diagnostic: boolean; interaction_type: string; interaction_config: JsonObject; options: string[] };
type GradingKey = { correct_index: number | null; correct_answer: unknown; explanation: string; thinking_principle: string; application: string; error_patterns: JsonObject };
export async function loadSessionAnswer(admin: SupabaseClient, userId: string, sessionId: string, challengeId: string, mode: ContentMode): Promise<{ challenge: GradingChallenge; key: GradingKey }> {
  const [snapshot] = await readSnapshots(admin, userId, sessionId, [challengeId], mode, true);
  if (!snapshot || typeof snapshot.challenge.difficulty !== "number" || typeof snapshot.challenge.interaction_type !== "string") throw new Error("This question cannot be graded consistently.");
  return { challenge: snapshot.challenge as GradingChallenge, key: snapshot.answer_key as GradingKey };
}
