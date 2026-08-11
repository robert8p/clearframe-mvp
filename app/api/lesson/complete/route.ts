import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { localDateKey } from "@/lib/dates";

const Input = z.object({ lessonId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const body = Input.parse(await req.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const admin = createAdminClient();
    const { data: lesson } = await admin
      .from("daily_lessons")
      .select("id,slug")
      .eq("id", body.lessonId)
      .eq("is_published", true)
      .maybeSingle();
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const day = localDateKey();
    const { data: awarded, error: completionError } = await admin.rpc("complete_daily_lesson_with_xp", {
      p_user_id: user.id,
      p_lesson_id: lesson.id,
      p_lesson_date: day,
      p_completed_at: new Date().toISOString(),
      p_xp_award: 5,
    });
    if (completionError) throw completionError;

    const xpEarned = Number(awarded ?? 0);
    if (xpEarned > 0) {
      await admin.from("analytics_events").insert({
        user_id: user.id,
        event_name: "daily_lesson_completed",
        properties: { lesson_id: lesson.id, lesson_slug: lesson.slug, lesson_date: day, xp_awarded: xpEarned },
      });
    }

    return NextResponse.json({ ok: true, xpEarned });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
