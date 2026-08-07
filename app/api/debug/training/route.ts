import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
          build_marker: "clearframe-persist-debug-v1",
          authenticated: false,
          error: userError?.message ?? "No authenticated user",
        },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    let supabaseHost = "missing";

    try {
      supabaseHost = new URL(url).host;
    } catch {
      supabaseHost = "invalid";
    }

    const { count: sessionCount, error: sessionError } = await admin
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: assignmentCount, error: assignmentError } = await admin
      .from("training_session_challenges")
      .select("*", { count: "exact", head: true });

    const { count: responseCount, error: responseError } = await admin
      .from("user_responses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    return NextResponse.json({
      build_marker: "clearframe-persist-debug-v1",
      authenticated: true,
      user_id: user.id,
      supabase_host: supabaseHost,
      training_sessions_for_user: sessionCount,
      training_session_assignments_total: assignmentCount,
      responses_for_user: responseCount,
      errors: {
        training_sessions: sessionError?.message ?? null,
        training_session_assignments: assignmentError?.message ?? null,
        user_responses: responseError?.message ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        build_marker: "clearframe-persist-debug-v1",
        fatal_error:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
