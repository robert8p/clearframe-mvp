import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();

    const cookieNames = cookieStore.getAll().map(({ name }) => name).sort();
    const supabaseCookieNames = cookieNames.filter(
      (name) => name.startsWith("sb-") || name.toLowerCase().includes("supabase"),
    );

    const supabase = await createClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    let configuredSupabaseHost = "missing";
    const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

    try {
      configuredSupabaseHost = new URL(configuredUrl).host;
    } catch {
      configuredSupabaseHost = configuredUrl ? "invalid" : "missing";
    }

    return NextResponse.json({
      build_marker: "clearframe-auth-debug-v2",
      request: {
        host: headerStore.get("host"),
        forwarded_host: headerStore.get("x-forwarded-host"),
        forwarded_proto: headerStore.get("x-forwarded-proto"),
      },
      cookies: {
        total_cookie_count: cookieNames.length,
        supabase_cookie_count: supabaseCookieNames.length,
        supabase_cookie_names: supabaseCookieNames,
      },
      supabase: {
        configured_host: configuredSupabaseHost,
        session_present: Boolean(session),
        session_user_id: session?.user?.id ?? null,
        session_error: sessionError?.message ?? null,
        authenticated_user_id: user?.id ?? null,
        user_error: userError?.message ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        build_marker: "clearframe-auth-debug-v2",
        fatal_error:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
