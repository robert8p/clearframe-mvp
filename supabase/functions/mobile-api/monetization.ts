import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";

export const PRO_ENTITLEMENT = "pro";
export const PRO_PRODUCTS = new Set(["cogni_pro_monthly", "cogni_pro_annual"]);
const REVENUECAT_API_BASE = "https://api.revenuecat.com/v1";
const REVENUECAT_TIMEOUT_MS = 10_000;

export type MonetizationConfig = {
  monetizationEnabled: boolean;
  freeCoreSessionsPerDay: number;
  focusedPracticeIsPro: boolean;
  progressHistoryFreeDays: number;
  proactivePaywallMinSessions: number;
  paywallExperiment: string;
};

export type EntitlementRow = {
  entitlement: string;
  status: string;
  product_id: string | null;
  store: string | null;
  purchase_date: string | null;
  expiration_date: string | null;
  will_renew: boolean;
  billing_issue: boolean;
  environment: string;
  updated_at: string;
};

export type EntitlementState = {
  isPro: boolean;
  stateReliable: boolean;
  entitlement: EntitlementRow | null;
  config: MonetizationConfig;
  serverTime: string;
};

export class PremiumRequiredError extends Error {
  status = 402;
  code = "premium_required";
  constructor(public feature: string) {
    super("Cogni Pro is required for this feature.");
    this.name = "PremiumRequiredError";
  }
}

export class BillingUnavailableError extends Error {
  status = 503;
  code = "billing_unavailable";
  constructor(message = "Cogni couldn't verify your subscription right now. Please try again.") {
    super(message);
    this.name = "BillingUnavailableError";
  }
}

export const SAFE_DEFAULT_CONFIG: MonetizationConfig = {
  monetizationEnabled: false,
  freeCoreSessionsPerDay: 1,
  focusedPracticeIsPro: true,
  progressHistoryFreeDays: 7,
  proactivePaywallMinSessions: 3,
  paywallExperiment: "control",
};

export function configFromRow(row: Record<string, unknown> | null): MonetizationConfig {
  if (!row) return SAFE_DEFAULT_CONFIG;
  return {
    monetizationEnabled: row.monetization_enabled === true,
    freeCoreSessionsPerDay: Math.max(1, Number(row.free_core_sessions_per_day ?? 1) || 1),
    focusedPracticeIsPro: row.focused_practice_is_pro !== false,
    progressHistoryFreeDays: Math.max(0, Number(row.progress_history_free_days ?? 7) || 0),
    proactivePaywallMinSessions: Math.max(0, Number(row.proactive_paywall_min_sessions ?? 3) || 0),
    paywallExperiment: typeof row.paywall_experiment === "string" && row.paywall_experiment ? row.paywall_experiment : "control",
  };
}

export function grantsAccess(row: EntitlementRow | null, nowMs = Date.now()) {
  if (!row) return false;
  if (!["active", "cancelled", "grace_period", "billing_issue"].includes(row.status)) return false;
  const expiration = row.expiration_date ? Date.parse(row.expiration_date) : 0;
  return Number.isFinite(expiration) && expiration > nowMs;
}

export async function loadEntitlementState(admin: SupabaseClient, userId: string): Promise<EntitlementState> {
  const serverTime = new Date().toISOString();
  const configQuery = await admin.from("monetization_config").select("monetization_enabled,free_core_sessions_per_day,focused_practice_is_pro,progress_history_free_days,proactive_paywall_min_sessions,paywall_experiment").eq("singleton", true).maybeSingle();
  if (configQuery.error) {
    console.error("monetization config unavailable", configQuery.error.message);
    return { isPro: false, stateReliable: false, entitlement: null, config: SAFE_DEFAULT_CONFIG, serverTime };
  }
  const config = configFromRow(configQuery.data as Record<string, unknown> | null);
  const entitlementQuery = await admin.from("subscription_entitlements").select("entitlement,status,product_id,store,purchase_date,expiration_date,will_renew,billing_issue,environment,updated_at").eq("user_id", userId).eq("entitlement", PRO_ENTITLEMENT).maybeSingle();
  if (entitlementQuery.error) {
    console.error("subscription entitlement unavailable", entitlementQuery.error.message);
    return {
      isPro: false,
      stateReliable: !config.monetizationEnabled,
      entitlement: null,
      config,
      serverTime,
    };
  }
  const entitlement = entitlementQuery.data as EntitlementRow | null;
  return { isPro: grantsAccess(entitlement), stateReliable: true, entitlement, config, serverTime };
}

export async function requirePro(admin: SupabaseClient, userId: string, feature: "focused_practice" | "progress_history") {
  const state = await loadEntitlementState(admin, userId);
  const featureRequiresPro = feature === "focused_practice" ? state.config.focusedPracticeIsPro : true;
  if (!state.stateReliable) throw new BillingUnavailableError();
  if (!state.config.monetizationEnabled || !featureRequiresPro) return state;
  if (!state.isPro) throw new PremiumRequiredError(feature);
  return state;
}

function productBase(value: string) {
  return value.split(":", 1)[0];
}

function dateMs(value: unknown) {
  if (typeof value !== "string" || !value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function chooseSubscription(subscriptions: Record<string, unknown>, preferredProduct: string | null) {
  const entries = Object.entries(subscriptions).filter(([key]) => PRO_PRODUCTS.has(productBase(key)));
  if (preferredProduct) {
    const direct = entries.find(([key]) => productBase(key) === productBase(preferredProduct));
    if (direct) return direct;
  }
  return entries.sort((a, b) => {
    const aRow = asRecord(a[1]), bRow = asRecord(b[1]);
    return Math.max(dateMs(bRow.grace_period_expires_date), dateMs(bRow.expires_date)) - Math.max(dateMs(aRow.grace_period_expires_date), dateMs(aRow.expires_date));
  })[0] ?? null;
}

export function projectSubscriber(subscriber: Record<string, unknown>, nowMs = Date.now()) {
  const entitlements = asRecord(subscriber.entitlements);
  const entitlement = asRecord(entitlements.pro);
  const preferredProduct = typeof entitlement.product_identifier === "string" ? entitlement.product_identifier : null;
  const subscriptions = asRecord(subscriber.subscriptions);
  const selected = chooseSubscription(subscriptions, preferredProduct);
  const selectedKey = selected?.[0] ?? null;
  const subscription = asRecord(selected?.[1]);
  const rawProduct = preferredProduct ?? selectedKey;
  const productId = rawProduct ? productBase(rawProduct) : null;
  const supportedProduct = Boolean(productId && PRO_PRODUCTS.has(productId));
  const normalExpiry = Math.max(dateMs(entitlement.expires_date), dateMs(subscription.expires_date));
  const graceExpiry = Math.max(dateMs(entitlement.grace_period_expires_date), dateMs(subscription.grace_period_expires_date));
  const expirationMs = Math.max(normalExpiry, graceExpiry);
  const refunded = Boolean(subscription.refunded_at);
  const billingIssue = Boolean(subscription.billing_issues_detected_at);
  const cancelled = Boolean(subscription.unsubscribe_detected_at);
  const active = Boolean(supportedProduct && !refunded && expirationMs > nowMs);
  const status = refunded && supportedProduct ? "refunded" : active && billingIssue && graceExpiry > nowMs ? "grace_period" : active && billingIssue ? "billing_issue" : active && cancelled ? "cancelled" : active ? "active" : supportedProduct ? "expired" : "unknown";
  const store = typeof subscription.store === "string" ? subscription.store : null;
  const purchaseDate = typeof entitlement.purchase_date === "string" ? entitlement.purchase_date : typeof subscription.purchase_date === "string" ? subscription.purchase_date : null;
  const isSandbox = subscription.is_sandbox;
  const environment = isSandbox === true ? "sandbox" : isSandbox === false ? "production" : "unknown";
  return {
    status,
    productId: supportedProduct ? productId : null,
    store,
    purchaseDate,
    expirationDate: expirationMs > 0 ? new Date(expirationMs).toISOString() : null,
    willRenew: active && !cancelled && !refunded,
    billingIssue,
    environment,
  };
}

async function revenueCatRequest(secret: string, path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVENUECAT_TIMEOUT_MS);
  try {
    return await fetch(`${REVENUECAT_API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${secret}`,
        accept: "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    console.error("RevenueCat request failed", error instanceof Error ? error.name : "unknown");
    throw new BillingUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncFromRevenueCat(admin: SupabaseClient, userId: string) {
  const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY")?.trim();
  if (!secret) throw new BillingUnavailableError("Subscription syncing isn't configured yet.");
  const response = await revenueCatRequest(secret, `/subscribers/${encodeURIComponent(userId)}`);
  if (!response.ok) {
    console.error("RevenueCat subscriber sync failed", response.status);
    throw new BillingUnavailableError();
  }
  const payload = asRecord(await response.json());
  const projection = projectSubscriber(asRecord(payload.subscriber));
  const { error } = await admin.rpc("sync_subscription_entitlement", {
    p_user_id: userId,
    p_entitlement: PRO_ENTITLEMENT,
    p_status: projection.status,
    p_product_id: projection.productId,
    p_store: projection.store,
    p_original_app_user_id: userId,
    p_purchase_date: projection.purchaseDate,
    p_expiration_date: projection.expirationDate,
    p_will_renew: projection.willRenew,
    p_billing_issue: projection.billingIssue,
    p_environment: projection.environment,
    p_event_id: null,
    p_event_type: "CLIENT_SYNC",
    p_app_user_id: userId,
    p_payload_sha256: null,
  });
  if (error) {
    console.error("subscription entitlement sync failed", error.message);
    throw new BillingUnavailableError();
  }
  return loadEntitlementState(admin, userId);
}

export async function deleteRevenueCatCustomer(admin: SupabaseClient, userId: string) {
  const configQuery = await admin.from("monetization_config").select("monetization_enabled").eq("singleton", true).maybeSingle();
  if (configQuery.error) {
    console.error("monetization config unavailable during account deletion", configQuery.error.message);
    throw new BillingUnavailableError("Cogni couldn't complete subscription-data deletion right now. Your account has not been deleted; please try again.");
  }
  const monetizationEnabled = configQuery.data?.monetization_enabled === true;
  const secret = Deno.env.get("REVENUECAT_SECRET_API_KEY")?.trim();
  if (!secret) {
    if (monetizationEnabled) {
      throw new BillingUnavailableError("Cogni couldn't complete subscription-data deletion right now. Your account has not been deleted; please try again.");
    }
    return { configured: false, deleted: false };
  }
  const response = await revenueCatRequest(secret, `/subscribers/${encodeURIComponent(userId)}`, { method: "DELETE" });
  if (response.status === 404) return { configured: true, deleted: true };
  if (!response.ok) {
    console.error("RevenueCat customer deletion failed", response.status);
    throw new BillingUnavailableError("Cogni couldn't complete subscription-data deletion right now. Your account has not been deleted; please try again.");
  }
  return { configured: true, deleted: true };
}

const ANALYTICS_EVENTS = new Set([
  "paywall_viewed",
  "paywall_dismissed",
  "premium_feature_selected",
  "purchase_started",
  "purchase_completed",
  "purchase_failed",
  "restore_started",
  "restore_completed",
]);
const ANALYTICS_PROPERTY_KEYS = new Set(["feature", "package", "product_id", "offering", "source", "outcome", "error_code", "experiment"]);

export async function recordMonetizationAnalytics(admin: SupabaseClient, userId: string, body: unknown) {
  const input = asRecord(body);
  const eventName = typeof input.eventName === "string" ? input.eventName : "";
  if (!ANALYTICS_EVENTS.has(eventName)) throw new Error("invalid_monetization_event");
  const rawProperties = asRecord(input.properties);
  const properties: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(rawProperties)) {
    if (!ANALYTICS_PROPERTY_KEYS.has(key)) continue;
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") properties[key] = typeof value === "string" ? value.slice(0, 160) : value;
  }
  const { error } = await admin.from("analytics_events").insert({ user_id: userId, event_name: eventName, properties });
  if (error) throw error;
  return { ok: true };
}
