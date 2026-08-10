import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { createClient as createCookieClient } from "@/lib/supabase/server";

export async function createRequestClient(req: Request): Promise<{ supabase: ReturnType<typeof createSupabaseClient>; user: User | null }> {
  const authorization = req.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase public environment variables");
    const supabase = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) return { supabase, user: null };
    return { supabase, user };
  }

  const supabase = await createCookieClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}
