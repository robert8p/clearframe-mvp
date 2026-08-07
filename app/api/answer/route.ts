import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextSkillScore, reliabilityFromAttempts } from "@/lib/scoring";
import { localDateKey, previousLocalDateKey } from "@/lib/dates";

const Input = z.object({
  challengeId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(10),
  confidence: z.number().min(0).max(100).optional(),
  responseTimeMs: z.number().int().min(0).max(3600000),
  mode: z.enum(["diagnostic", "training"]),
  sessionId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const body = Input.parse(await req.json());

    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    if (body.mode === "training") {
      const { data: trainingSession } = await admin
        .from("training_sessions")
        .select("id,status")
        .eq("id", body.sessionId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!trainingSession) {
        return NextResponse.json(
          { error: "Training session not found." },
          { status: 403 },
        );
      }

      if (trainingSession.status === "completed") {
        return NextResponse.json(
          { error: "This training session is already complete." },
          { status: 409 },
        );
      }

      const { data: assignment } = await admin
        .from("training_session_challenges")
        .select("challenge_id")
        .eq("session_id", body.sessionId)
        .eq("challenge_id", body.challengeId)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: "This challenge is not assigned to this session." },
          { status: 403 },
        );
      }
    }

    const [
      { data: challenge },
      { data: key },
      { data: mappings },
    ] = await Promise.all([
      admin
        .from("challenges")
        .select("id,difficulty,is_diagnostic")
        .eq("id", body.challengeId)
        .eq("is_published", true)
        .single(),
      admin
        .from("challenge_answer_keys")
        .select(
          "correct_index,explanation,thinking_principle,application,error_patterns",
        )
        .eq("challenge_id", body.challengeId)
        .single(),
      admin
        .from("challenge_skill_mapping")
        .select("skill_id,weight,skills(slug)")
        .eq("challenge_id", body.challengeId),
    ]);

    if (!challenge || !key) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    if (body.mode === "diagnostic" && !challenge.is_diagnostic) {
      return NextResponse.json(
        { error: "This is not a diagnostic challenge." },
        { status: 400 },
      );
    }

    if (body.mode === "training" && challenge.is_diagnostic) {
      return NextResponse.json(
        { error: "Diagnostic challenges cannot be submitted as training." },
        { status: 400 },
      );
    }

    const correct = body.selectedIndex === key.correct_index;
    const errorPatterns =
      key.error_patterns &&
      typeof key.error_patterns === "object"
        ? key.error_patterns
        : {};

    const pattern = correct
      ? null
      : (
          errorPatterns as Record<string, string>
        )[String(body.selectedIndex)] ?? "premature_closure";

    const { data: existing } = await admin
      .from("user_responses")
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_id", body.challengeId)
      .eq("session_key", body.sessionId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error:
            "This challenge has already been submitted in this session.",
        },
        { status: 409 },
      );
    }

    const { error: responseInsertError } = await admin
      .from("user_responses")
      .insert({
        user_id: user.id,
        challenge_id: body.challengeId,
        selected_index: body.selectedIndex,
        is_correct: correct,
        confidence: body.confidence ?? null,
        response_time_ms: body.responseTimeMs,
        error_pattern: pattern,
        session_key: body.sessionId,
      });

    if (responseInsertError) throw responseInsertError;

    const updates: {
      slug: string;
      score: number;
      reliability: number;
    }[] = [];

    for (const mapping of mappings ?? []) {
      const { data: old } = await admin
        .from("user_skill_scores")
        .select("score,attempts")
        .eq("user_id", user.id)
        .eq("skill_id", mapping.skill_id)
        .maybeSingle();

      const attempts = (old?.attempts ?? 0) + 1;

      const score = nextSkillScore(
        old?.score ?? 50,
        challenge.difficulty,
        correct,
        Boolean(challenge.is_diagnostic),
        mapping.weight ?? 1,
      );

      const reliability = reliabilityFromAttempts(attempts);

      await admin.from("user_skill_scores").upsert(
        {
          user_id: user.id,
          skill_id: mapping.skill_id,
          score,
          reliability,
          attempts,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_id" },
      );

      const skill = Array.isArray(mapping.skills)
        ? mapping.skills[0]
        : mapping.skills;

      updates.push({
        slug: skill?.slug ?? "skill",
        score,
        reliability,
      });
    }

    if (pattern) {
      const { data: errorPattern } = await admin
        .from("user_error_patterns")
        .select("id,count")
        .eq("user_id", user.id)
        .eq("pattern", pattern)
        .maybeSingle();

      if (errorPattern) {
        await admin
          .from("user_error_patterns")
          .update({
            count: errorPattern.count + 1,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", errorPattern.id);
      } else {
        await admin.from("user_error_patterns").insert({
          user_id: user.id,
          pattern,
          count: 1,
        });
      }
    }

    const xp = correct ? 12 : 7;
    const today = localDateKey();
    const yesterday = previousLocalDateKey();

    const { data: profile } = await admin
      .from("profiles")
      .select("xp,current_streak,last_session_date")
      .eq("id", user.id)
      .single();

    let streak = profile?.current_streak ?? 0;
    const lastSessionDate = profile?.last_session_date;

    if (lastSessionDate !== today) {
      streak =
        lastSessionDate === yesterday
          ? streak + 1
          : 1;
    }

    await admin
      .from("profiles")
      .update({
        xp: (profile?.xp ?? 0) + xp,
        current_streak: streak,
        last_session_date: today,
      })
      .eq("id", user.id);

    await admin.from("analytics_events").insert([
      {
        user_id: user.id,
        event_name: "answer_submitted",
        properties: {
          challenge_id: body.challengeId,
          mode: body.mode,
          session_id: body.sessionId,
          confidence: body.confidence,
          response_time_ms: body.responseTimeMs,
        },
      },
      {
        user_id: user.id,
        event_name: correct
          ? "answer_correct"
          : "answer_incorrect",
        properties: {
          challenge_id: body.challengeId,
          mode: body.mode,
          session_id: body.sessionId,
          confidence: body.confidence,
          response_time_ms: body.responseTimeMs,
        },
      },
    ]);

    let sessionCompleted = false;

    if (body.mode === "training") {
      const [
        { count: assignedCount },
        { count: answeredCount },
      ] = await Promise.all([
        admin
          .from("training_session_challenges")
          .select("*", { count: "exact", head: true })
          .eq("session_id", body.sessionId),
        admin
          .from("user_responses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("session_key", body.sessionId),
      ]);

      if (
        (assignedCount ?? 0) > 0 &&
        (answeredCount ?? 0) >= (assignedCount ?? 0)
      ) {
        sessionCompleted = true;

        await admin
          .from("training_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.sessionId)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({
      correct,
      correctIndex: key.correct_index,
      explanation: key.explanation,
      thinkingPrinciple: key.thinking_principle,
      application: key.application,
      errorPattern: pattern,
      skillUpdates: updates,
      xpEarned: xp,
      sessionCompleted,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid request",
      },
      { status: 400 },
    );
  }
}
