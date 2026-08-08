import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCE_SEGMENTS } from "@/lib/audience";

const allowed = new Set(["all", ...AUDIENCE_SEGMENTS.map((item) => item.slug)]);
const Input = z.object({
  title: z.string().min(4), subtitle: z.string().min(4), emoji: z.string().min(1).max(8), skillSlug: z.string().min(2),
  difficulty: z.number().min(20).max(90), estimatedMinutes: z.number().int().min(1).max(10), scenarioContext: z.string().max(240).optional().default(""),
  audienceSegments: z.array(z.string()).min(1),
  content: z.object({ story: z.string().min(20), twist: z.string().min(20), principle: z.string().min(10), try_it: z.string().min(10), reveal: z.string().min(10), ai_age: z.string().min(20) }),
});
function slugify(text: string) { return text.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60); }
export async function POST(req: Request) {
  try {
    if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = Input.parse(await req.json());
    if (body.audienceSegments.some((value: string) => !allowed.has(value))) throw new Error("Unknown audience segment.");
    if (body.audienceSegments.includes("all") && body.audienceSegments.length > 1) throw new Error("Choose All audiences on its own, or specific audiences.");
    const admin = createAdminClient();
    const { data: skill } = await admin.from("skills").select("id").eq("slug", body.skillSlug).single();
    if (!skill) throw new Error("Unknown skill slug.");
    const id = crypto.randomUUID();
    const slug = `${slugify(body.title)}-${id.slice(0,8)}`;
    const { error } = await admin.from("daily_lessons").insert({ id, slug, title: body.title, subtitle: body.subtitle, emoji: body.emoji, skill_id: skill.id, content: body.content, estimated_minutes: body.estimatedMinutes, difficulty: body.difficulty, audience_segments: body.audienceSegments, scenario_context: body.scenarioContext || null, is_published: true, sort_order: 9999 });
    if (error) throw error;
    return NextResponse.json({ id, slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
