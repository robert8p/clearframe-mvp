import { NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/request";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import { getOrCreatePracticeSession } from "@/lib/practice";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const { supabase, user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const diagnostic = await getDiagnosticProgress(supabase, user.id);
    if (!diagnostic.completedSessionKey) return NextResponse.json({ error: "Complete your starting check first." }, { status: 409 });
    const { data: skill } = await supabase.from("skills").select("name,slug").eq("slug", slug).maybeSingle();
    if (!skill) return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    const session = await getOrCreatePracticeSession(supabase, user.id, slug, 3);
    if (!session?.id || !session.challenges.length) return NextResponse.json({ error: "No suitable practice questions are available yet." }, { status: 404 });
    return NextResponse.json({ skill, session, modeLabel: `${skill.name} practice` });
  } catch (error) {
    console.error("mobile practice", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load practice" }, { status: 400 });
  }
}
