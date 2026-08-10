import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRequestClient } from "@/lib/supabase/request";
import { localDateKey } from "@/lib/dates";

const Input = z.object({ lessonId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const body = Input.parse(await req.json());
    const { user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const admin = createAdminClient();
    const { data: lesson } = await admin.from("daily_lessons").select("id,slug").eq("id", body.lessonId).eq("is_published", true).maybeSingle();
    if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    const day = localDateKey();
    const { data: existing } = await admin.from("user_lesson_completions").select("id").eq("user_id", user.id).eq("lesson_date", day).maybeSingle();
    let xpEarned = 0;
    if (!existing) {
      const { error } = await admin.from("user_lesson_completions").insert({ user_id: user.id, lesson_id: lesson.id, lesson_date: day, completed_at: new Date().toISOString() });
      if (error) throw error;
      const { data: profile } = await admin.from("profiles").select("xp").eq("id", user.id).single();
      xpEarned = 5;
      await admin.from("profiles").update({ xp: Number(profile?.xp ?? 0) + xpEarned }).eq("id", user.id);
      await admin.from("analytics_events").insert({ user_id: user.id, event_name: "mobile_daily_lesson_completed", properties: { lesson_id: lesson.id, lesson_slug: lesson.slug, lesson_date: day, xp_awarded: xpEarned } });
    }
    return NextResponse.json({ ok: true, xpEarned });
  } catch (error) {
    console.error("mobile lesson complete", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
