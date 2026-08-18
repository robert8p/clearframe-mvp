import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createRequestClient } from "@/lib/supabase/request";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import { getOrCreateDailyTrainingSession } from "@/lib/recommendation";
import { getOrAssignDailyLesson, isDailyLessonComplete } from "@/lib/lessons";
import { audienceSessionLabel, isAudienceSegment } from "@/lib/audience";
import { situationLabelForMoment, type ContextMoment } from "@/lib/context-profile";

const CHALLENGE_FIELDS = "id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context,scenario_category,function_tags,industry_tags,goal_tags,complexity_level";

function localMoment(req: Request): ContextMoment | undefined {
  const params = new URL(req.url).searchParams;
  const hour = Number(params.get("localHour"));
  const minute = Number(params.get("localMinute"));
  const weekday = Number(params.get("localWeekday"));
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return undefined;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return undefined;
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return undefined;
  return { localHour: hour, localMinute: minute, localWeekday: weekday };
}

export async function GET(req: Request) {
  try {
    const { supabase, user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    const moment = localMoment(req);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("audience_segment,full_name,function_area,industry,primary_goal")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;
    if (!isAudienceSegment(profile?.audience_segment)) {
      return NextResponse.json({ state: "onboarding", profile });
    }

    const diagnostic = await getDiagnosticProgress(supabase, user.id);
    if (!diagnostic.completedSessionKey) {
      const { data, error } = diagnostic.challengeIds.length
        ? await supabase.from("challenges").select(CHALLENGE_FIELDS).in("id", diagnostic.challengeIds).eq("is_published", true)
        : { data: [], error: null };
      if (error) throw error;
      const byId = new Map((data ?? []).map((challenge: { id: string }) => [challenge.id, challenge]));
      return NextResponse.json({
        state: "diagnostic",
        sessionId: diagnostic.resumableSessionKey ?? randomUUID(),
        answeredChallengeIds: diagnostic.answeredChallengeIds,
        challenges: diagnostic.challengeIds.map((id) => byId.get(id)).filter(Boolean),
        modeLabel: "Starting check",
        profile,
      });
    }

    const session = await getOrCreateDailyTrainingSession(supabase, user.id, undefined, moment);
    if (!session.id || !session.challenges.length) {
      return NextResponse.json({ state: "unavailable", profile, message: "Cogni couldn't prepare today's training yet." });
    }
    if (session.status === "completed" || session.answeredChallengeIds.length >= session.challenges.length) {
      return NextResponse.json({ state: "complete", profile, session, modeLabel: audienceSessionLabel(profile.audience_segment) });
    }

    const lessonComplete = await isDailyLessonComplete(supabase, user.id);
    if (!lessonComplete) {
      const lesson = await getOrAssignDailyLesson(supabase, user.id, session.id, moment);
      if (lesson) {
        return NextResponse.json({
          state: "lesson",
          profile,
          session,
          lesson,
          modeLabel: audienceSessionLabel(profile.audience_segment),
          situationLabel: situationLabelForMoment(moment),
        });
      }
    }

    return NextResponse.json({ state: "training", profile, session, modeLabel: audienceSessionLabel(profile.audience_segment) });
  } catch (error) {
    console.error("mobile today", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load today's training" }, { status: 400 });
  }
}
