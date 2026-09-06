import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.110.8";

const CATEGORIES = new Set(["account", "subscription", "billing", "learning", "bug", "privacy", "other"]);

function inputRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function createSupportRequest(admin: SupabaseClient, user: User, body: unknown) {
  const input = inputRecord(body);
  const category = typeof input.category === "string" ? input.category.trim().toLowerCase() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  const appVersion = typeof input.appVersion === "string" ? input.appVersion.trim().slice(0, 40) : null;
  const platform = typeof input.platform === "string" ? input.platform.trim().toLowerCase().slice(0, 20) : null;

  if (!CATEGORIES.has(category)) throw new Error("invalid_support_category");
  if (message.length < 10 || message.length > 4000) throw new Error("invalid_support_message");
  if (platform && !["ios", "android", "web"].includes(platform)) throw new Error("invalid_support_platform");

  const { data, error } = await admin.from("support_requests").insert({
    user_id: user.id,
    email: user.email ?? null,
    category,
    message,
    app_version: appVersion,
    platform,
    status: "open",
  }).select("id,created_at").single();
  if (error) throw error;

  return { ok: true, requestId: data.id, createdAt: data.created_at };
}
