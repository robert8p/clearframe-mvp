import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AUDIENCE_SEGMENTS } from "@/lib/audience";

const allowed = AUDIENCE_SEGMENTS.map((item) => item.slug) as [string, ...string[]];
const Input = z.object({ audienceSegment: z.enum(allowed) });

export async function POST(req: Request) {
  try {
    const body = Input.parse(await req.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const { error } = await supabase
      .from("profiles")
      .update({ audience_segment: body.audienceSegment, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw error;

    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_name: "audience_segment_selected",
      properties: { audience_segment: body.audienceSegment },
    });

    return NextResponse.json({ ok: true, audienceSegment: body.audienceSegment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid learning context" }, { status: 400 });
  }
}
