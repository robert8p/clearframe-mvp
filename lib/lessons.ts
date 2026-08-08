import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey } from "@/lib/dates";
import type { DailyLesson } from "@/lib/types";

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export async function getOrAssignDailyLesson(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<DailyLesson | null> {
  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .select("id,lesson_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (sessionError) throw sessionError;

  if (session.lesson_id) {
    const { data, error } = await supabase
      .from("daily_lessons")
      .select("id,slug,title,subtitle,emoji,estimated_minutes,content")
      .eq("id", session.lesson_id)
      .eq("is_published", true)
      .single();
    if (error) throw error;
    return data as DailyLesson;
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("training_session_challenges")
    .select("target_skill_id,position")
    .eq("session_id", sessionId)
    .order("position")
    .limit(5);

  if (assignmentError) throw assignmentError;

  const targetSkillId = (assignments ?? []).find((row: { target_skill_id: string | null }) => row.target_skill_id)?.target_skill_id ?? null;

  let query = supabase
    .from("daily_lessons")
    .select("id,slug,title,subtitle,emoji,estimated_minutes,content")
    .eq("is_published", true);

  if (targetSkillId) query = query.eq("skill_id", targetSkillId);

  let { data: lessons, error: lessonError } = await query.order("sort_order").limit(50);
  if (lessonError) throw lessonError;

  if (!lessons?.length && targetSkillId) {
    const fallback = await supabase
      .from("daily_lessons")
      .select("id,slug,title,subtitle,emoji,estimated_minutes,content")
      .eq("is_published", true)
      .order("sort_order")
      .limit(50);
    if (fallback.error) throw fallback.error;
    lessons = fallback.data;
  }

  if (!lessons?.length) return null;

  const day = localDateKey();
  const picked = lessons[hash(`${userId}:${day}:${targetSkillId ?? "general"}`) % lessons.length] as DailyLesson;
  const admin = createAdminClient();
  await admin
    .from("training_sessions")
    .update({ lesson_id: picked.id, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);

  return picked;
}

export async function isDailyLessonComplete(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_lesson_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("lesson_date", localDateKey())
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}
