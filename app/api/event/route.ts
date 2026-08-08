import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const allowed = [
  "app_opened",
  "page_viewed",
  "user_returned",
  "onboarding_started",
  "onboarding_completed",
  "audience_selected",
  "audience_changed",
  "diagnostic_started",
  "diagnostic_completed",
  "daily_lesson_started",
  "daily_lesson_step",
  "daily_lesson_reveal",
  "session_started",
  "session_completed",
  "practice_started",
  "practice_completed",
  "challenge_viewed",
  "explanation_viewed",
  "reward_viewed",
] as const;

const Input = z.object({
  eventName: z.enum(allowed),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Input.parse(await req.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const { error } = await supabase.from("analytics_events").insert({ user_id: user.id, event_name: body.eventName, properties: body.properties ?? {} });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
