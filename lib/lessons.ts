import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey } from "@/lib/dates";
import type { DailyLesson } from "@/lib/types";
import { audienceDifficultyTarget, audienceMatches, isAudienceSegment } from "@/lib/audience";
import {
  contentContextScore,
  contentEligibleForMoment,
  contextMode,
  contextProfileFromRow,
  type ContextMoment,
  type ContextProfile,
} from "@/lib/context-profile";

function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
function curated(lesson: DailyLesson) { return lesson.content_key?.startsWith("v014_") ? 1 : 0; }
function scenarioKey(lesson: DailyLesson) {
  return (lesson.scenario_category || lesson.scenario_context)?.trim().toLowerCase().replace(/\s+/g, " ") ?? null;
}
function feedbackSets(rows: unknown[]) {
  const lessonIds = new Set<string>();
  const scenarios = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const properties = (row as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object") continue;
    const lessonId = (properties as { lesson_id?: unknown }).lesson_id;
    const category = (properties as { scenario_category?: unknown }).scenario_category;
    if (typeof lessonId === "string" && lessonId.trim()) lessonIds.add(lessonId.trim());
    if (typeof category === "string" && category.trim()) scenarios.add(category.trim().toLowerCase().replace(/\s+/g, " "));
  }
  return { lessonIds, scenarios };
}
function rankLessons(
  lessons: DailyLesson[],
  target: number,
  seed: string,
  recentIds: Set<string>,
  recentScenarios: Set<string>,
  dislikedIds: Set<string>,
  dislikedScenarios: Set<string>,
  audience: Parameters<typeof contentContextScore>[1],
  profile: ContextProfile,
  moment?: ContextMoment,
) {
  return [...lessons].sort((a, b) => {
    const scenarioA = scenarioKey(a);
    const scenarioB = scenarioKey(b);
    const dislikedA = dislikedIds.has(a.id) || Boolean(scenarioA && dislikedScenarios.has(scenarioA)) ? 1 : 0;
    const dislikedB = dislikedIds.has(b.id) || Boolean(scenarioB && dislikedScenarios.has(scenarioB)) ? 1 : 0;
    if (dislikedA !== dislikedB) return dislikedA - dislikedB;
    const recentA = recentIds.has(a.id) ? 1 : 0;
    const recentB = recentIds.has(b.id) ? 1 : 0;
    if (recentA !== recentB) return recentA - recentB;
    const repeatedA = scenarioA && recentScenarios.has(scenarioA) ? 1 : 0;
    const repeatedB = scenarioB && recentScenarios.has(scenarioB) ? 1 : 0;
    if (repeatedA !== repeatedB) return repeatedA - repeatedB;
    const contextA = contentContextScore(a, audience, profile, moment);
    const contextB = contentContextScore(b, audience, profile, moment);
    if (contextA !== contextB) return contextB - contextA;
    const curatedA = curated(a);
    const curatedB = curated(b);
    if (curatedA !== curatedB) return curatedB - curatedA;
    const distanceA = Math.abs(Number(a.difficulty ?? 50) - target);
    const distanceB = Math.abs(Number(b.difficulty ?? 50) - target);
    return distanceA - distanceB || hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
  });
}

const FIELDS = "id,content_key,slug,title,subtitle,emoji,estimated_minutes,difficulty,audience_segments,scenario_context,scenario_category,function_tags,industry_tags,goal_tags,complexity_level,content";

export async function getOrAssignDailyLesson(supabase: SupabaseClient, userId: string, sessionId: string, moment?: ContextMoment): Promise<DailyLesson | null> {
  const [{ data: session, error: sessionError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("training_sessions").select("id,lesson_id").eq("id", sessionId).eq("user_id", userId).single(),
    supabase.from("profiles").select("audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale").eq("id", userId).single(),
  ]);
  if (sessionError) throw sessionError;
  if (profileError) throw profileError;
  if (!isAudienceSegment(profile?.audience_segment)) return null;

  const audience = profile.audience_segment;
  const context = contextProfileFromRow(profile);

  // Older mobile/web clients do not send local context. Keep their stable assignment only when it still
  // belongs to the user's audience; stale cross-audience assignments are repaired immediately.
  if (session.lesson_id && !moment) {
    const { data, error } = await supabase.from("daily_lessons").select(FIELDS).eq("id", session.lesson_id).eq("is_published", true).single();
    if (error) throw error;
    const existing = data as DailyLesson;
    if (audienceMatches(existing.audience_segments, audience)) return existing;
  }

  const [{ data: assignments, error: assignmentError }, { data: scoreRows }, { data: recent }, { data: feedbackRows }] = await Promise.all([
    supabase.from("training_session_challenges").select("target_skill_id,position").eq("session_id", sessionId).order("position").limit(5),
    supabase.from("user_skill_scores").select("skill_id,score,reliability,attempts").eq("user_id", userId).gt("attempts", 0).order("score").limit(6),
    supabase.from("user_lesson_completions").select("lesson_id,completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(20),
    supabase.from("analytics_events").select("properties,created_at").eq("user_id", userId).eq("event_name", "situation_not_relevant").order("created_at", { ascending: false }).limit(30),
  ]);
  if (assignmentError) throw assignmentError;

  const targetSkillId = (assignments ?? []).find((row: { target_skill_id: string | null }) => row.target_skill_id)?.target_skill_id ?? null;
  const targetRow = (scoreRows ?? []).find((row: { skill_id: string }) => row.skill_id === targetSkillId) ?? scoreRows?.[0];
  const measured = targetRow ? 50 + (Number(targetRow.score) - 50) * Number(targetRow.reliability ?? 0) : 50;
  const target = audienceDifficultyTarget(audience, measured);
  const recentIds = new Set<string>((recent ?? []).map((row: { lesson_id: string }) => row.lesson_id));
  const recentScenarios = new Set<string>();
  const recentIdList = [...recentIds];
  if (recentIdList.length) {
    const { data: recentLessons, error } = await supabase.from("daily_lessons").select("id,scenario_context,scenario_category").in("id", recentIdList);
    if (error) throw error;
    for (const row of (recentLessons ?? []) as DailyLesson[]) {
      const key = scenarioKey(row);
      if (key) recentScenarios.add(key);
    }
  }
  const disliked = feedbackSets(feedbackRows ?? []);

  let query = supabase.from("daily_lessons").select(FIELDS).eq("is_published", true);
  if (targetSkillId) query = query.eq("skill_id", targetSkillId);
  const { data: rows, error } = await query.order("sort_order").limit(300);
  if (error) throw error;

  let lessons = ((rows ?? []) as DailyLesson[]).filter((lesson) => moment ? contentEligibleForMoment(lesson, audience, moment) : audienceMatches(lesson.audience_segments, audience));
  if (!lessons.length && targetSkillId) {
    const fallback = await supabase.from("daily_lessons").select(FIELDS).eq("is_published", true).order("sort_order").limit(400);
    if (fallback.error) throw fallback.error;
    lessons = ((fallback.data ?? []) as DailyLesson[]).filter((lesson) => moment ? contentEligibleForMoment(lesson, audience, moment) : audienceMatches(lesson.audience_segments, audience));
  }
  if (!lessons.length) return null;

  // Without local context keep the old exact-audience preference. With it, rank role-native and life-native
  // variants together so evenings/weekends can feel personal while work hours stay professionally relevant.
  const exact = lessons.filter((lesson) => lesson.audience_segments?.includes(audience));
  const pool = moment ? lessons : exact.length ? exact : lessons;
  const day = localDateKey();
  const picked = rankLessons(
    pool,
    target,
    `${userId}:${day}:${targetSkillId ?? "general"}:${audience}:${contextMode(moment)}`,
    recentIds,
    recentScenarios,
    disliked.lessonIds,
    disliked.scenarios,
    audience,
    context,
    moment,
  )[0];
  if (!picked) return null;

  if (session.lesson_id !== picked.id) {
    const admin = createAdminClient();
    const { error: updateError } = await admin.from("training_sessions").update({ lesson_id: picked.id, updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", userId);
    if (updateError) throw updateError;
  }
  return picked;
}

export async function isDailyLessonComplete(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("user_lesson_completions").select("id").eq("user_id", userId).eq("lesson_date", localDateKey()).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
