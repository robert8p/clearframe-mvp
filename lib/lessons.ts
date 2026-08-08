import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey } from "@/lib/dates";
import type { DailyLesson } from "@/lib/types";
import { audienceDifficultyTarget, audienceMatches, isAudienceSegment } from "@/lib/audience";

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rankLessons(lessons: DailyLesson[], targetDifficulty: number, seed: string, recentIds: Set<string>) {
  return [...lessons].sort((a, b) => {
    const recentA = recentIds.has(a.id) ? 1 : 0;
    const recentB = recentIds.has(b.id) ? 1 : 0;
    if (recentA !== recentB) return recentA - recentB;
    const difficultyA = Math.abs(Number(a.difficulty ?? 50) - targetDifficulty);
    const difficultyB = Math.abs(Number(b.difficulty ?? 50) - targetDifficulty);
    if (difficultyA !== difficultyB) return difficultyA - difficultyB;
    return hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
  });
}

export async function getOrAssignDailyLesson(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<DailyLesson | null> {
  const [{ data: session, error: sessionError }, { data: profile, error: profileError }] = await Promise.all([
    supabase.from("training_sessions").select("id,lesson_id").eq("id", sessionId).eq("user_id", userId).single(),
    supabase.from("profiles").select("audience_segment").eq("id", userId).single(),
  ]);
  if (sessionError) throw sessionError;
  if (profileError) throw profileError;
  if (!isAudienceSegment(profile?.audience_segment)) return null;
  const audience = profile.audience_segment;

  if (session.lesson_id) {
    const { data, error } = await supabase
      .from("daily_lessons")
      .select("id,slug,title,subtitle,emoji,estimated_minutes,difficulty,audience_segments,scenario_context,content")
      .eq("id", session.lesson_id)
      .eq("is_published", true)
      .single();
    if (error) throw error;
    return data as DailyLesson;
  }

  const [{ data: assignments, error: assignmentError }, { data: scoreRows }, { data: recentCompletions }] = await Promise.all([
    supabase.from("training_session_challenges").select("target_skill_id,position").eq("session_id", sessionId).order("position").limit(5),
    supabase.from("user_skill_scores").select("skill_id,score,reliability,attempts").eq("user_id", userId).gt("attempts", 0).order("score").limit(6),
    supabase.from("user_lesson_completions").select("lesson_id,completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(8),
  ]);
  if (assignmentError) throw assignmentError;

  const targetSkillId = (assignments ?? []).find((row: { target_skill_id: string | null }) => row.target_skill_id)?.target_skill_id ?? null;
  const targetScoreRow = (scoreRows ?? []).find((row: { skill_id: string }) => row.skill_id === targetSkillId) ?? scoreRows?.[0];
  const measuredScore = targetScoreRow ? 50 + (Number(targetScoreRow.score) - 50) * Number(targetScoreRow.reliability ?? 0) : 50;
  const targetDifficulty = audienceDifficultyTarget(audience, measuredScore);
  const recentIds = new Set<string>((recentCompletions ?? []).map((row: { lesson_id: string }) => row.lesson_id));

  let query = supabase
    .from("daily_lessons")
    .select("id,slug,title,subtitle,emoji,estimated_minutes,difficulty,audience_segments,scenario_context,content")
    .eq("is_published", true);
  if (targetSkillId) query = query.eq("skill_id", targetSkillId);

  let { data: lessonRows, error: lessonError } = await query.order("sort_order").limit(100);
  if (lessonError) throw lessonError;
  let lessons = ((lessonRows ?? []) as DailyLesson[]).filter((lesson) => audienceMatches(lesson.audience_segments, audience));

  if (!lessons.length && targetSkillId) {
    const fallback = await supabase
      .from("daily_lessons")
      .select("id,slug,title,subtitle,emoji,estimated_minutes,difficulty,audience_segments,scenario_context,content")
      .eq("is_published", true)
      .order("sort_order")
      .limit(150);
    if (fallback.error) throw fallback.error;
    lessons = ((fallback.data ?? []) as DailyLesson[]).filter((lesson) => audienceMatches(lesson.audience_segments, audience));
  }

  if (!lessons.length) return null;
  const audienceSpecific = lessons.filter((lesson) => lesson.audience_segments?.includes(audience));
  const preferredLessons = audienceSpecific.length ? audienceSpecific : lessons;
  const day = localDateKey();
  const ranked = rankLessons(preferredLessons, targetDifficulty, `${userId}:${day}:${targetSkillId ?? "general"}:${audience}`, recentIds);
  const picked = ranked[0];
  const admin = createAdminClient();
  await admin.from("training_sessions").update({ lesson_id: picked.id, updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", userId);
  return picked;
}

export async function isDailyLessonComplete(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_lesson_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("lesson_date", localDateKey())
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
