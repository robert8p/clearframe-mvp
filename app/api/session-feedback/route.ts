import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  reaction: z.enum(["not_for_me", "good", "great"]),
  comment: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  try {
    const body = Input.parse(await req.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const admin = createAdminClient();
    const [{ data: session }, { data: profile }] = await Promise.all([
      admin.from("training_sessions").select("id").eq("user_id", user.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("profiles").select("audience_segment").eq("id", user.id).maybeSingle(),
    ]);
    if (!session?.id) return NextResponse.json({ error: "No completed daily session found." }, { status: 404 });

    const now = new Date().toISOString();
    const { error } = await admin.from("session_feedback").upsert({
      user_id: user.id,
      session_id: session.id,
      reaction: body.reaction,
      comment: body.comment || null,
      audience_segment: profile?.audience_segment ?? null,
      updated_at: now,
    }, { onConflict: "user_id,session_id" });
    if (error) throw error;

    await admin.from("analytics_events").insert({
      user_id: user.id,
      event_name: "session_feedback_submitted",
      properties: { session_id: session.id, reaction: body.reaction, has_comment: Boolean(body.comment), audience_segment: profile?.audience_segment ?? null },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
