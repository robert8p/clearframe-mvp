import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDailyTrainingSession } from "@/lib/recommendation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          build_marker: "clearframe-persistence-debug-v3",
          authenticated: false,
          error: userError?.message ?? "No authenticated user",
        },
        { status: 401 },
      );
    }

    const session = await getOrCreateDailyTrainingSession(
      supabase,
      user.id,
      5,
    );

    let assignments:
      | Array<{
          position: number;
          selection_reason: string;
          challenge_id: string;
          target_skill_id: string | null;
        }>
      | null = null;

    let assignmentError: string | null = null;

    if (session.id) {
      const { data, error } = await supabase
        .from("training_session_challenges")
        .select(
          "position,selection_reason,challenge_id,target_skill_id",
        )
        .eq("session_id", session.id)
        .order("position");

      assignments = data ?? null;
      assignmentError = error?.message ?? null;
    }

    return NextResponse.json({
      build_marker: "clearframe-persistence-debug-v3",
      authenticated: true,
      user_id: user.id,
      result: {
        session_id: session.id,
        session_date: session.sessionDate,
        status: session.status,
        challenge_count: session.challenges.length,
        answered_count: session.answeredChallengeIds.length,
        challenge_titles: session.challenges.map(
          (challenge) => challenge.title,
        ),
        assignments,
        assignment_error: assignmentError,
      },
    });
  } catch (error) {
    console.error("Persistence debug failed", error);

    return NextResponse.json(
      {
        build_marker: "clearframe-persistence-debug-v3",
        authenticated: true,
        persistence_test: "failed",
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error),
      },
      { status: 500 },
    );
  }
}
