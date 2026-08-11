import { NextResponse } from "next/server";
import { z } from "zod";
import { createRequestClient } from "@/lib/supabase/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextSkillScoreObserved, reliabilityFromAttempts } from "@/lib/scoring";
import { awardXpAndMaybeDailyStreak, guardDiagnosticSubmission } from "@/lib/answer-guards";

const Input = z.object({
  challengeId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(20).optional(),
  responsePayload: z.unknown().optional(),
  confidence: z.number().min(0).max(100).optional(),
  responseTimeMs: z.number().int().min(0).max(3600000),
  mode: z.enum(["diagnostic", "training", "practice"]),
  sessionId: z.string().uuid(),
});

type Evaluation = { correct: boolean; scoreFraction: number; storedPayload: unknown };

function arraysEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function evaluateAnswer(
  type: string,
  count: number,
  selectedIndex: number | undefined,
  payload: unknown,
  correctIndex: number | null,
  correctAnswer: unknown,
): Evaluation {
  if (type === "single_choice" || type === "triage") {
    const chosen = selectedIndex ?? (typeof payload === "number" ? payload : undefined);
    if (chosen === undefined || correctIndex === null) throw new Error("Choose an answer before submitting.");
    if (chosen < 0 || chosen >= count) throw new Error("Choose a valid answer before submitting.");
    return { correct: chosen === correctIndex, scoreFraction: chosen === correctIndex ? 1 : 0, storedPayload: chosen };
  }

  if (type === "multi_select") {
    if (!Array.isArray(payload)) throw new Error("Select every answer that applies.");
    const chosen = [...new Set(payload.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
    if (chosen.some((value) => value < 0 || value >= count)) throw new Error("Choose only valid answers.");
    const expected = (Array.isArray(correctAnswer) ? correctAnswer : []).map(Number).sort((a, b) => a - b);
    const selected = new Set(chosen);
    const correctSet = new Set(expected);
    let right = 0;
    for (let index = 0; index < count; index += 1) if (selected.has(index) === correctSet.has(index)) right += 1;
    return { correct: arraysEqual(chosen, expected), scoreFraction: count ? right / count : 0, storedPayload: chosen };
  }

  if (type === "ranking") {
    if (!Array.isArray(payload)) throw new Error("Rank every item before submitting.");
    const chosen = payload.map(Number).filter(Number.isInteger);
    const expected = (Array.isArray(correctAnswer) ? correctAnswer : []).map(Number);
    if (chosen.length !== count || new Set(chosen).size !== count || chosen.some((value) => value < 0 || value >= count)) {
      throw new Error("Rank every item exactly once before submitting.");
    }
    const right = chosen.reduce((sum, value, index) => sum + (value === expected[index] ? 1 : 0), 0);
    return { correct: arraysEqual(chosen, expected), scoreFraction: count ? right / count : 0, storedPayload: chosen };
  }

  if (type === "classification") {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Classify every statement before submitting.");
    const chosen = payload as Record<string, string>;
    const expected = (correctAnswer && typeof correctAnswer === "object" && !Array.isArray(correctAnswer) ? correctAnswer : {}) as Record<string, string>;
    const keys = Object.keys(expected);
    if (!keys.length || keys.some((key) => typeof chosen[key] !== "string" || !chosen[key])) {
      throw new Error("Classify every statement before submitting.");
    }
    const right = keys.reduce((sum, key) => sum + (chosen[key] === expected[key] ? 1 : 0), 0);
    return { correct: right === keys.length, scoreFraction: right / keys.length, storedPayload: chosen };
  }

  throw new Error("Unsupported question format.");
}

export async function POST(req: Request) {
  try {
    const body = Input.parse(await req.json());
    const { user } = await createRequestClient(req);
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const admin = createAdminClient();

    if (body.mode === "diagnostic") {
      const guard = await guardDiagnosticSubmission(admin, user.id, body.sessionId, body.challengeId);
      if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    if (body.mode === "training") {
      const { data: session } = await admin.from("training_sessions").select("id,status").eq("id", body.sessionId).eq("user_id", user.id).maybeSingle();
      if (!session) return NextResponse.json({ error: "Training session not found." }, { status: 403 });
      if (session.status === "completed") return NextResponse.json({ error: "This training session is already complete." }, { status: 409 });
      const { data: assignment } = await admin.from("training_session_challenges").select("challenge_id").eq("session_id", body.sessionId).eq("challenge_id", body.challengeId).maybeSingle();
      if (!assignment) return NextResponse.json({ error: "This challenge is not assigned to this session." }, { status: 403 });
    }

    if (body.mode === "practice") {
      const { data: session } = await admin.from("practice_sessions").select("id,status").eq("id", body.sessionId).eq("user_id", user.id).maybeSingle();
      if (!session) return NextResponse.json({ error: "Practice session not found." }, { status: 403 });
      if (session.status === "completed") return NextResponse.json({ error: "This practice session is already complete." }, { status: 409 });
      const { data: assignment } = await admin.from("practice_session_challenges").select("challenge_id").eq("session_id", body.sessionId).eq("challenge_id", body.challengeId).maybeSingle();
      if (!assignment) return NextResponse.json({ error: "This challenge is not assigned to this practice session." }, { status: 403 });
    }

    const [{ data: challenge }, { data: key }, { data: mappings }] = await Promise.all([
      admin.from("challenges").select("id,difficulty,is_diagnostic,interaction_type,options").eq("id", body.challengeId).eq("is_published", true).single(),
      admin.from("challenge_answer_keys").select("correct_index,correct_answer,explanation,thinking_principle,application,error_patterns").eq("challenge_id", body.challengeId).single(),
      admin.from("challenge_skill_mapping").select("skill_id,weight,skills(name,slug)").eq("challenge_id", body.challengeId),
    ]);

    if (!challenge || !key) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    if (body.mode === "diagnostic" && !challenge.is_diagnostic) return NextResponse.json({ error: "This is not a diagnostic challenge." }, { status: 400 });
    if ((body.mode === "training" || body.mode === "practice") && challenge.is_diagnostic) {
      return NextResponse.json({ error: "Diagnostic challenges cannot be submitted as practice." }, { status: 400 });
    }

    const type = challenge.interaction_type ?? "single_choice";
    const optionCount = Array.isArray(challenge.options) ? challenge.options.length : 0;
    const evaluation = evaluateAnswer(type, optionCount, body.selectedIndex, body.responsePayload, key.correct_index ?? null, key.correct_answer ?? key.correct_index);
    const scoreFraction = Number(evaluation.scoreFraction.toFixed(4));
    const xp = Math.max(7, Math.min(12, Math.round(7 + scoreFraction * 5)));
    const errorPatterns = key.error_patterns && typeof key.error_patterns === "object" ? key.error_patterns as Record<string, string> : {};
    const pattern = evaluation.correct
      ? null
      : (type === "single_choice" || type === "triage")
        ? errorPatterns[String(body.selectedIndex)] ?? errorPatterns.default ?? "premature_closure"
        : errorPatterns.default ?? "premature_closure";

    const { data: existing } = await admin.from("user_responses").select("id").eq("user_id", user.id).eq("challenge_id", body.challengeId).eq("session_key", body.sessionId).maybeSingle();
    if (existing) return NextResponse.json({ error: "This challenge has already been submitted in this session." }, { status: 409 });

    const { data: insertedResponse, error: insertError } = await admin.from("user_responses").insert({
      user_id: user.id,
      challenge_id: body.challengeId,
      selected_index: typeof evaluation.storedPayload === "number" ? evaluation.storedPayload : null,
      response_payload: evaluation.storedPayload,
      score_fraction: scoreFraction,
      is_correct: evaluation.correct,
      confidence: body.confidence ?? null,
      response_time_ms: body.responseTimeMs,
      error_pattern: pattern,
      session_key: body.sessionId,
      xp_awarded: xp,
    }).select("id").single();
    if (insertError) throw insertError;
    if (!insertedResponse?.id) throw new Error("Response was saved without an id.");

    const updates: { slug: string; name: string; score: number; reliability: number; delta: number }[] = [];
    for (const mapping of mappings ?? []) {
      const { data: old } = await admin.from("user_skill_scores").select("score,reliability,attempts").eq("user_id", user.id).eq("skill_id", mapping.skill_id).maybeSingle();
      const before = Number(old?.score ?? 50);
      const reliabilityBefore = Number(old?.reliability ?? 0);
      const attemptsBefore = Number(old?.attempts ?? 0);
      const attemptsAfter = attemptsBefore + 1;
      const after = nextSkillScoreObserved(before, challenge.difficulty, scoreFraction, Boolean(challenge.is_diagnostic), mapping.weight ?? 1);
      const reliabilityAfter = reliabilityFromAttempts(attemptsAfter);

      await admin.from("user_skill_scores").upsert({
        user_id: user.id,
        skill_id: mapping.skill_id,
        score: after,
        reliability: reliabilityAfter,
        attempts: attemptsAfter,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "user_id,skill_id" });

      await admin.from("user_response_skill_updates").insert({
        response_id: insertedResponse.id,
        user_id: user.id,
        skill_id: mapping.skill_id,
        score_before: before,
        score_after: after,
        reliability_before: reliabilityBefore,
        reliability_after: reliabilityAfter,
        attempts_before: attemptsBefore,
        attempts_after: attemptsAfter,
        weight: mapping.weight ?? 1,
      });

      const skill = Array.isArray(mapping.skills) ? mapping.skills[0] : mapping.skills;
      updates.push({
        slug: skill?.slug ?? "skill",
        name: skill?.name ?? "Skill",
        score: after,
        reliability: reliabilityAfter,
        delta: Number((after - before).toFixed(1)),
      });
    }

    if (pattern) {
      const { data: existingPattern } = await admin.from("user_error_patterns").select("id,count").eq("user_id", user.id).eq("pattern", pattern).maybeSingle();
      if (existingPattern) {
        await admin.from("user_error_patterns").update({ count: existingPattern.count + 1, last_seen_at: new Date().toISOString() }).eq("id", existingPattern.id);
      } else {
        await admin.from("user_error_patterns").insert({ user_id: user.id, pattern, count: 1 });
      }
    }

    let sessionCompleted = false;
    const sessionTable = body.mode === "practice" ? "practice_session_challenges" : "training_session_challenges";
    if (body.mode === "training" || body.mode === "practice") {
      const [{ count: assigned }, { count: answered }] = await Promise.all([
        admin.from(sessionTable).select("*", { count: "exact", head: true }).eq("session_id", body.sessionId),
        admin.from("user_responses").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("session_key", body.sessionId),
      ]);
      if ((assigned ?? 0) > 0 && (answered ?? 0) >= (assigned ?? 0)) {
        sessionCompleted = true;
        if (body.mode === "training") {
          await admin.from("training_sessions").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", body.sessionId).eq("user_id", user.id);
        } else {
          await admin.from("practice_sessions").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", body.sessionId).eq("user_id", user.id);
        }
      }
    }

    await awardXpAndMaybeDailyStreak(admin, user.id, xp, body.mode === "training" && sessionCompleted);

    await admin.from("analytics_events").insert({
      user_id: user.id,
      event_name: "mobile_answer_submitted",
      properties: {
        challenge_id: body.challengeId,
        interaction_type: type,
        score_fraction: scoreFraction,
        mode: body.mode,
        session_id: body.sessionId,
        xp_awarded: xp,
        session_completed: sessionCompleted,
      },
    });

    return NextResponse.json({
      correct: evaluation.correct,
      correctIndex: key.correct_index,
      correctAnswer: key.correct_answer ?? key.correct_index,
      scoreFraction,
      explanation: key.explanation,
      thinkingPrinciple: key.thinking_principle,
      application: key.application,
      errorPattern: pattern,
      skillUpdates: updates,
      xpEarned: xp,
      sessionCompleted,
    });
  } catch (error) {
    console.error("mobile answer", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
