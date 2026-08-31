import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";
import {
  BillingUnavailableError,
  PremiumRequiredError,
  grantsAccess,
  loadEntitlementState,
  projectSubscriber,
  requirePro,
  type EntitlementRow,
} from "./monetization.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

type QueryResult = { data: Record<string, unknown> | null; error: { message: string } | null };

function fakeAdmin(config: QueryResult, entitlement: QueryResult) {
  return {
    from(table: string) {
      const result = table === "monetization_config" ? config : entitlement;
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        async maybeSingle() { return result; },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

const enabledConfig = {
  monetization_enabled: true,
  free_core_sessions_per_day: 1,
  focused_practice_is_pro: true,
  progress_history_free_days: 7,
  proactive_paywall_min_sessions: 3,
  paywall_experiment: "control",
};

const disabledConfig = { ...enabledConfig, monetization_enabled: false };

function activeEntitlement(): EntitlementRow {
  return {
    entitlement: "pro",
    status: "active",
    product_id: "cogni_pro_monthly",
    store: "play_store",
    purchase_date: "2026-08-20T00:00:00.000Z",
    expiration_date: "2099-09-20T00:00:00.000Z",
    will_renew: true,
    billing_issue: false,
    environment: "sandbox",
    updated_at: "2026-08-26T00:00:00.000Z",
  };
}

async function expectError(promise: Promise<unknown>, constructor: typeof BillingUnavailableError | typeof PremiumRequiredError, message: string) {
  try {
    await promise;
  } catch (error) {
    assert(error instanceof constructor, message);
    return error;
  }
  throw new Error(message);
}

Deno.test("known disabled monetisation keeps free learning open even if entitlement storage is unavailable", async () => {
  const admin = fakeAdmin(
    { data: disabledConfig, error: null },
    { data: null, error: { message: "temporary entitlement outage" } },
  );
  const state = await loadEntitlementState(admin, "user-1");
  assert(state.stateReliable, "a verified disabled config should be sufficient to keep the free product open");
  await requirePro(admin, "user-1", "focused_practice");
});

Deno.test("unknown monetisation config fails protected routes closed", async () => {
  const admin = fakeAdmin(
    { data: null, error: { message: "temporary config outage" } },
    { data: null, error: null },
  );
  const state = await loadEntitlementState(admin, "user-2");
  assert(!state.stateReliable, "an unreadable config must not be treated as confirmed free access");
  await expectError(requirePro(admin, "user-2", "focused_practice"), BillingUnavailableError, "config outage must return billing unavailable");
});

Deno.test("enabled monetisation denies a free bearer identity", async () => {
  const admin = fakeAdmin(
    { data: enabledConfig, error: null },
    { data: null, error: null },
  );
  const error = await expectError(requirePro(admin, "user-3", "focused_practice"), PremiumRequiredError, "free user must be denied");
  assert((error as PremiumRequiredError).feature === "focused_practice", "premium error must identify the protected feature");
});

Deno.test("enabled monetisation accepts a current server entitlement", async () => {
  const admin = fakeAdmin(
    { data: enabledConfig, error: null },
    { data: activeEntitlement() as unknown as Record<string, unknown>, error: null },
  );
  const state = await requirePro(admin, "user-4", "focused_practice");
  assert(state.isPro, "active server entitlement should unlock the protected route");
});

Deno.test("access projection honours expiry, cancellation and revocation", () => {
  const now = Date.parse("2026-08-26T00:00:00.000Z");
  const row = activeEntitlement();
  row.expiration_date = "2026-09-20T00:00:00.000Z";
  row.status = "cancelled";
  row.will_renew = false;
  assert(grantsAccess(row, now), "cancelled but unexpired access should remain active");
  row.expiration_date = "2026-08-25T00:00:00.000Z";
  assert(!grantsAccess(row, now), "expired access must be denied");
  row.expiration_date = "2026-09-20T00:00:00.000Z";
  row.status = "refunded";
  assert(!grantsAccess(row, now), "refunded access must be denied immediately");
});

Deno.test("RevenueCat projection accepts exact Cogni products including Android base-plan suffixes", () => {
  const now = Date.parse("2026-08-26T00:00:00.000Z");
  const projected = projectSubscriber({
    entitlements: { pro: { product_identifier: "cogni_pro_annual:annual", purchase_date: "2026-08-20T00:00:00.000Z", expires_date: "2027-08-20T00:00:00.000Z" } },
    subscriptions: { "cogni_pro_annual:annual": { expires_date: "2027-08-20T00:00:00.000Z", is_sandbox: true, store: "play_store" } },
  }, now);
  assert(projected.status === "active", "supported annual base plan should be active");
  assert(projected.productId === "cogni_pro_annual", "base-plan suffix must normalize to the approved product ID");
  assert(projected.environment === "sandbox", "sandbox state must be retained");
});

Deno.test("RevenueCat projection rejects unrelated or misconfigured products", () => {
  const projected = projectSubscriber({
    entitlements: { pro: { product_identifier: "unrelated_premium_monthly", expires_date: "2099-01-01T00:00:00.000Z" } },
    subscriptions: { unrelated_premium_monthly: { expires_date: "2099-01-01T00:00:00.000Z", store: "app_store" } },
  }, Date.parse("2026-08-26T00:00:00.000Z"));
  assert(projected.status === "unknown", "unapproved product must not project as active");
  assert(projected.productId === null, "unapproved product must not be persisted as a Cogni Pro product");
});
