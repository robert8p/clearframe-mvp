import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";
import {
  projectProEntitlement,
  sha256Hex,
  stableUserId,
  transferUserIds,
  verifyRevenueCatSignature,
  type EntitlementProjection,
  type RevenueCatEvent,
  type RevenueCatSubscriber,
} from "./logic.ts";

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVENUECAT_TIMEOUT_MS = 10_000;

class RevenueCatSyncError extends Error {
  constructor() {
    super("RevenueCat subscriber sync failed.");
    this.name = "RevenueCatSyncError";
  }
}

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function env(name: string) {
  return Deno.env.get(name)?.trim() ?? "";
}

function configuredSecretKey() {
  const encoded = env("SUPABASE_SECRET_KEYS");
  if (encoded) {
    try {
      const parsed = JSON.parse(encoded) as Record<string, string>;
      if (typeof parsed.default === "string" && parsed.default) return parsed.default;
    } catch { /* use individual automatic/legacy variables */ }
  }
  return [env("SUPABASE_SECRET_KEY"), env("SUPABASE_SERVICE_ROLE_KEY"), env("SB_SECRET_KEY")].find(Boolean) ?? "";
}

function serverCredentials() {
  const url = env("SUPABASE_URL");
  const key = configuredSecretKey();
  if (!url || !key) throw new Error("Supabase server credentials are unavailable.");
  return { url, key };
}

async function recordIgnored(admin: SupabaseClient, eventId: string, eventType: string, appUserId: string | null, environment: "sandbox" | "production" | "unknown", payloadHash: string) {
  const { error } = await admin.from("subscription_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    app_user_id: appUserId,
    environment,
    payload_sha256: payloadHash,
    outcome: "ignored",
    processed_at: new Date().toISOString(),
  });
  if (error && error.code !== "23505") throw error;
}

function normalEnvironment(value: unknown): "sandbox" | "production" | "unknown" {
  if (typeof value !== "string") return "unknown";
  const lowered = value.toLowerCase();
  return lowered === "sandbox" ? "sandbox" : lowered === "production" ? "production" : "unknown";
}

async function fetchSubscriber(appUserId: string, secret: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVENUECAT_TIMEOUT_MS);
  try {
    return await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
      signal: controller.signal,
      headers: { authorization: `Bearer ${secret}`, accept: "application/json" },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function loadProjection(appUserId: string, secret: string, eventType: string, eventEnvironment: unknown) {
  let customerResponse: Response;
  try {
    customerResponse = await fetchSubscriber(appUserId, secret);
  } catch (error) {
    console.error("RevenueCat customer sync request failed", error instanceof Error ? error.name : "unknown");
    throw new RevenueCatSyncError();
  }
  if (!customerResponse.ok) {
    console.error("RevenueCat customer sync failed", customerResponse.status);
    throw new RevenueCatSyncError();
  }
  const customerPayload = await customerResponse.json() as { subscriber?: RevenueCatSubscriber };
  return projectProEntitlement(customerPayload.subscriber ?? {}, eventType, eventEnvironment);
}

async function loadTransferDestinationProjection(appUserId: string, secret: string, eventEnvironment: unknown) {
  let projection = await loadProjection(appUserId, secret, "TRANSFER", eventEnvironment);
  for (const delayMs of [500, 1_500]) {
    if (projection.status !== "unknown") break;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    projection = await loadProjection(appUserId, secret, "TRANSFER", eventEnvironment);
  }
  return projection;
}

function projectionPayload(userId: string, projection: EntitlementProjection) {
  return {
    user_id: userId,
    status: projection.status,
    product_id: projection.productId,
    store: projection.store,
    original_app_user_id: userId,
    purchase_date: projection.purchaseDate,
    expiration_date: projection.expirationDate,
    will_renew: projection.willRenew,
    billing_issue: projection.billingIssue,
    environment: projection.environment,
  };
}

async function knownProfileIds(admin: SupabaseClient, userIds: string[]) {
  if (!userIds.length) return new Set<string>();
  const { data, error } = await admin.from("profiles").select("id").in("id", userIds);
  if (error) throw error;
  return new Set((data ?? []).map((row) => String(row.id)));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response(405, { error: "method_not_allowed" });

  try {
    const hmacSecret = env("REVENUECAT_WEBHOOK_HMAC_SECRET");
    const configuredAuthorization = env("REVENUECAT_WEBHOOK_AUTHORIZATION");
    if (!hmacSecret || !configuredAuthorization) return response(503, { error: "webhook_not_configured" });

    if (req.headers.get("authorization") !== configuredAuthorization) {
      return response(401, { error: "invalid_authorization" });
    }

    const rawBody = new Uint8Array(await req.arrayBuffer());
    const signatureValid = await verifyRevenueCatSignature(rawBody, req.headers.get("x-revenuecat-webhook-signature"), hmacSecret);
    if (!signatureValid) return response(401, { error: "invalid_signature" });

    let payload: { event?: RevenueCatEvent };
    try {
      payload = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      return response(400, { error: "invalid_json" });
    }

    const event = payload.event;
    const eventId = typeof event?.id === "string" ? event.id.slice(0, 255) : "";
    const eventType = typeof event?.type === "string" ? event.type.slice(0, 120) : "UNKNOWN";
    if (!eventId) return response(400, { error: "missing_event_id" });
    const payloadHash = await sha256Hex(rawBody);
    const eventEnvironment = normalEnvironment(event?.environment);
    const rawAppUserId = typeof event?.app_user_id === "string" ? event.app_user_id.slice(0, 1500) : null;

    const { url, key } = serverCredentials();
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: existing, error: existingError } = await admin
      .from("subscription_webhook_events")
      .select("event_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return response(200, { ok: true, duplicate: true });

    const revenueCatSecret = env("REVENUECAT_SECRET_API_KEY");
    if (!revenueCatSecret) return response(503, { error: "revenuecat_api_not_configured" });

    if (eventType === "TRANSFER") {
      const transfer = transferUserIds(event ?? {});
      const orderedTargets = [
        ...transfer.sources.map((userId) => ({ userId, role: "source" as const })),
        ...transfer.destinations.map((userId) => ({ userId, role: "destination" as const })),
      ];
      const known = await knownProfileIds(admin, orderedTargets.map((target) => target.userId));
      const knownTargets = orderedTargets.filter((target) => known.has(target.userId));
      if (!knownTargets.length) {
        await recordIgnored(admin, eventId, eventType, rawAppUserId, eventEnvironment, payloadHash);
        return response(200, { ok: true, ignored: "deleted_or_unknown_transfer_users" });
      }

      const projections = [];
      for (const target of knownTargets) {
        // RevenueCat defines TRANSFER as removing transactions/entitlements from every
        // transferred_from ID. Revoke those source IDs directly rather than risking an
        // alias lookup that accidentally returns the destination customer's current state.
        const projection = target.role === "source"
          ? projectProEntitlement({}, "TRANSFER", event?.environment)
          : await loadTransferDestinationProjection(target.userId, revenueCatSecret, event?.environment);
        projections.push(projectionPayload(target.userId, projection));
      }

      const processedUserId = [...knownTargets].reverse().find((target) => target.role === "destination")?.userId
        ?? knownTargets[knownTargets.length - 1].userId;
      const { data: syncResult, error: syncError } = await admin.rpc("sync_subscription_transfer", {
        p_event_id: eventId,
        p_event_type: eventType,
        p_app_user_id: rawAppUserId ?? processedUserId,
        p_environment: eventEnvironment,
        p_payload_sha256: payloadHash,
        p_processed_user_id: processedUserId,
        p_projections: projections,
      });
      if (syncError) throw syncError;
      return response(200, { ok: true, transfer: true, result: syncResult });
    }

    const appUserId = stableUserId(event ?? {});
    if (!appUserId || !uuidRe.test(appUserId)) {
      await recordIgnored(admin, eventId, eventType, rawAppUserId, eventEnvironment, payloadHash);
      return response(200, { ok: true, ignored: "no_stable_user" });
    }

    const known = await knownProfileIds(admin, [appUserId]);
    if (!known.has(appUserId)) {
      await recordIgnored(admin, eventId, eventType, rawAppUserId ?? appUserId, eventEnvironment, payloadHash);
      return response(200, { ok: true, ignored: "deleted_or_unknown_user" });
    }

    const projection = await loadProjection(appUserId, revenueCatSecret, eventType, event?.environment);
    const originalAppUserId = typeof event?.original_app_user_id === "string" ? event.original_app_user_id.slice(0, 1500) : appUserId;

    const { data: syncResult, error: syncError } = await admin.rpc("sync_subscription_entitlement", {
      p_user_id: appUserId,
      p_entitlement: "pro",
      p_status: projection.status,
      p_product_id: projection.productId,
      p_store: projection.store,
      p_original_app_user_id: originalAppUserId,
      p_purchase_date: projection.purchaseDate,
      p_expiration_date: projection.expirationDate,
      p_will_renew: projection.willRenew,
      p_billing_issue: projection.billingIssue,
      p_environment: projection.environment,
      p_event_id: eventId,
      p_event_type: eventType,
      p_app_user_id: rawAppUserId ?? appUserId,
      p_payload_sha256: payloadHash,
    });
    if (syncError) throw syncError;

    return response(200, { ok: true, result: syncResult });
  } catch (error) {
    if (error instanceof RevenueCatSyncError) return response(502, { error: "revenuecat_sync_failed" });
    console.error("revenuecat-webhook error", error instanceof Error ? error.message : "unknown");
    return response(500, { error: "internal_error" });
  }
});
