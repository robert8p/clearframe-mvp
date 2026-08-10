import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRequestClient } from "@/lib/supabase/request";
import { isAudienceSegment } from "@/lib/audience";

const UpdateInput = z.object({
  fullName: z.string().trim().max(100).nullable().optional(),
  audienceSegment: z.string().nullable().optional(),
  functionArea: z.string().trim().max(100).nullable().optional(),
  industry: z.string().trim().max(100).nullable().optional(),
  primaryGoal: z.string().trim().max(160).nullable().optional(),
  studyStage: z.string().trim().max(100).nullable().optional(),
  roleFocus: z.string().trim().max(120).nullable().optional(),
  responsibilityScope: z.string().trim().max(120).nullable().optional(),
  organisationScale: z.string().trim().max(100).nullable().optional(),
});

async function payload(userId: string, email: string | undefined) {
  const admin = createAdminClient();
  const [{ data: profile, error: pe }, { data: skillScores, error: se }, { data: responseRows, error: re }] = await Promise.all([
    admin.from("profiles").select("id,full_name,audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale,xp,current_streak,last_session_date").eq("id", userId).single(),
    admin.from("user_skill_scores").select("skill_id,score,reliability,attempts,last_seen_at,skills(name,slug,description)").eq("user_id", userId).order("score"),
    admin.from("user_responses").select("id,is_correct,score_fraction,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ]);
  if (pe) throw pe;
  if (se) throw se;
  if (re) throw re;
  const responses = responseRows ?? [];
  const avgScore = responses.length ? responses.reduce((sum, row) => sum + Number(row.score_fraction ?? (row.is_correct ? 1 : 0)), 0) / responses.length : null;
  return { profile: { ...profile, email }, skillScores: skillScores ?? [], summary: { answers: responses.length, averageScore: avgScore } };
}

export async function GET(req: Request) {
  try {
    const { user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    return NextResponse.json(await payload(user.id, user.email));
  } catch (error) {
    console.error("mobile profile", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load profile" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const body = UpdateInput.parse(await req.json());
    if (body.audienceSegment !== undefined && body.audienceSegment !== null && !isAudienceSegment(body.audienceSegment)) {
      return NextResponse.json({ error: "Choose a valid learning context." }, { status: 400 });
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), context_updated_at: new Date().toISOString() };
    if (body.fullName !== undefined) updates.full_name = body.fullName || null;
    if (body.audienceSegment !== undefined) updates.audience_segment = body.audienceSegment;
    if (body.functionArea !== undefined) updates.function_area = body.functionArea || null;
    if (body.industry !== undefined) updates.industry = body.industry || null;
    if (body.primaryGoal !== undefined) updates.primary_goal = body.primaryGoal || null;
    if (body.studyStage !== undefined) updates.study_stage = body.studyStage || null;
    if (body.roleFocus !== undefined) updates.role_focus = body.roleFocus || null;
    if (body.responsibilityScope !== undefined) updates.responsibility_scope = body.responsibilityScope || null;
    if (body.organisationScale !== undefined) updates.organisation_scale = body.organisationScale || null;
    const admin = createAdminClient();
    const { error } = await admin.from("profiles").update(updates).eq("id", user.id);
    if (error) throw error;
    await admin.from("analytics_events").insert({ user_id: user.id, event_name: "mobile_profile_updated", properties: { audience_segment: body.audienceSegment, function_area: body.functionArea, industry: body.industry, primary_goal: body.primaryGoal } });
    return NextResponse.json(await payload(user.id, user.email));
  } catch (error) {
    console.error("mobile profile update", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save profile" }, { status: 400 });
  }
}
