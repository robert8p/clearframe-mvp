export const SUPPORTED_PRODUCTS = new Set(["cogni_pro_monthly", "cogni_pro_annual"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RevenueCatEvent = {
  id?: unknown;
  type?: unknown;
  app_user_id?: unknown;
  original_app_user_id?: unknown;
  aliases?: unknown;
  transferred_to?: unknown;
  transferred_from?: unknown;
  environment?: unknown;
};

type RevenueCatEntitlement = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string | null;
  purchase_date?: string | null;
};

type RevenueCatSubscription = {
  billing_issues_detected_at?: string | null;
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  is_sandbox?: boolean | null;
  purchase_date?: string | null;
  refunded_at?: string | null;
  store?: string | null;
  unsubscribe_detected_at?: string | null;
};

export type RevenueCatSubscriber = {
  entitlements?: Record<string, RevenueCatEntitlement> | null;
  subscriptions?: Record<string, RevenueCatSubscription> | null;
  management_url?: string | null;
};

export type EntitlementProjection = {
  status: "active" | "cancelled" | "grace_period" | "billing_issue" | "expired" | "refunded" | "revoked" | "unknown";
  productId: string | null;
  store: string | null;
  purchaseDate: string | null;
  expirationDate: string | null;
  willRenew: boolean;
  billingIssue: boolean;
  environment: "sandbox" | "production" | "unknown";
  isPro: boolean;
};

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function stableUserId(event: RevenueCatEvent): string | null {
  const candidates: unknown[] = [
    event.app_user_id,
    event.original_app_user_id,
    ...strings(event.aliases),
    ...strings(event.transferred_to),
    ...strings(event.transferred_from),
  ];
  for (const value of candidates) if (typeof value === "string" && UUID_RE.test(value)) return value;
  return null;
}

function epoch(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function productBase(value: string) {
  return value.split(":", 1)[0];
}

function relevantSubscription(subscriber: RevenueCatSubscriber, preferredProduct?: string | null) {
  const entries = Object.entries(subscriber.subscriptions ?? {}).filter(([key]) => SUPPORTED_PRODUCTS.has(productBase(key)));
  if (preferredProduct && SUPPORTED_PRODUCTS.has(productBase(preferredProduct))) {
    const direct = entries.find(([key]) => key === preferredProduct || productBase(key) === productBase(preferredProduct));
    if (direct) return direct;
  }
  return entries
    .sort((a, b) => Math.max(epoch(b[1].grace_period_expires_date), epoch(b[1].expires_date)) - Math.max(epoch(a[1].grace_period_expires_date), epoch(a[1].expires_date)))[0] ?? null;
}

export function projectProEntitlement(subscriber: RevenueCatSubscriber, eventType: string, eventEnvironment: unknown, nowMs = Date.now()): EntitlementProjection {
  const entitlement = subscriber.entitlements?.pro ?? null;
  const selected = relevantSubscription(subscriber, entitlement?.product_identifier ?? null);
  const subscriptionKey = selected?.[0] ?? null;
  const subscription = selected?.[1] ?? null;
  const rawProduct = entitlement?.product_identifier ?? subscriptionKey;
  const candidateProductId = rawProduct ? productBase(rawProduct) : null;
  const supportedProduct = Boolean(candidateProductId && SUPPORTED_PRODUCTS.has(candidateProductId));
  const productId = supportedProduct ? candidateProductId : null;
  const normalExpiry = Math.max(epoch(entitlement?.expires_date), epoch(subscription?.expires_date));
  const graceExpiry = Math.max(epoch(entitlement?.grace_period_expires_date), epoch(subscription?.grace_period_expires_date));
  const effectiveExpiry = Math.max(normalExpiry, graceExpiry);
  const refunded = Boolean(subscription?.refunded_at) || eventType === "REFUND";
  const billingIssue = Boolean(subscription?.billing_issues_detected_at);
  const cancelled = Boolean(subscription?.unsubscribe_detected_at);
  const active = supportedProduct && !refunded && effectiveExpiry > nowMs;

  let status: EntitlementProjection["status"];
  if (refunded) status = "refunded";
  else if (active && billingIssue && graceExpiry > nowMs) status = "grace_period";
  else if (active && billingIssue) status = "billing_issue";
  else if (active && cancelled) status = "cancelled";
  else if (active) status = "active";
  else if (eventType === "TRANSFER") status = "revoked";
  else if (supportedProduct) status = "expired";
  else status = "unknown";

  const eventEnv = typeof eventEnvironment === "string" ? eventEnvironment.toLowerCase() : "";
  const environment: EntitlementProjection["environment"] = subscription?.is_sandbox === true || eventEnv === "sandbox"
    ? "sandbox"
    : subscription?.is_sandbox === false || eventEnv === "production"
      ? "production"
      : "unknown";

  return {
    status,
    productId,
    store: subscription?.store ?? null,
    purchaseDate: entitlement?.purchase_date ?? subscription?.purchase_date ?? null,
    expirationDate: effectiveExpiry > 0 ? new Date(effectiveExpiry).toISOString() : null,
    willRenew: active && !cancelled && !refunded,
    billingIssue,
    environment,
    isPro: active,
  };
}

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array | null {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const result = new Uint8Array(value.length / 2);
  for (let index = 0; index < result.length; index += 1) result[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return result;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function sha256Hex(bytes: Uint8Array) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

export async function revenueCatSignature(secret: string, timestamp: string, rawBody: Uint8Array) {
  const prefix = new TextEncoder().encode(`${timestamp}.`);
  const signed = new Uint8Array(prefix.length + rawBody.length);
  signed.set(prefix);
  signed.set(rawBody, prefix.length);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, signed)));
}

export async function verifyRevenueCatSignature(rawBody: Uint8Array, header: string | null, secret: string, nowMs = Date.now(), toleranceSeconds = 300) {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim().split("=", 2) as [string, string]);
  const timestamp = parts.find(([key]) => key === "t")?.[1] ?? "";
  const suppliedSignatures = parts.filter(([key]) => key === "v1").map(([, value]) => value).filter(Boolean);
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(nowMs / 1000 - seconds) > toleranceSeconds || !suppliedSignatures.length) return false;
  const computedBytes = fromHex(await revenueCatSignature(secret, timestamp, rawBody));
  if (!computedBytes) return false;
  let matched = false;
  for (const supplied of suppliedSignatures) {
    const suppliedBytes = fromHex(supplied);
    if (suppliedBytes && constantTimeEqual(computedBytes, suppliedBytes)) matched = true;
  }
  return matched;
}
