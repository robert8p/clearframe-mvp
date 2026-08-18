import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestClient } from "@/lib/supabase/request";

const Input = z.object({ lessonId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const { supabase, user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const body = Input.parse(await req.json());
    const { data: lesson, error: lessonError } = await supabase
      .from("daily_lessons")
      .select("id,scenario_category")
      .eq("id", body.lessonId)
      .eq("is_published", true)
      .single();
    if (lessonError) throw lessonError;
    const { error } = await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: "situation_not_relevant",
      properties: {
        lesson_id: lesson.id,
        scenario_category: lesson.scenario_category ?? null,
        source: "mobile_lesson",
      },
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("mobile context feedback", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save feedback" }, { status: 400 });
  }
}
