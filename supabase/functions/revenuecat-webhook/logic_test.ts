import { projectProEntitlement, revenueCatSignature, stableUserId, transferUserIds, verifyRevenueCatSignature } from "./logic.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("webhook signature validates raw body and rejects tampering/replay", async () => {
  const secret = "test-secret";
  const timestamp = "1787698800";
  const nowMs = Number(timestamp) * 1000;
  const body = new TextEncoder().encode('{"event":{"id":"evt_1"}}');
  const signature = await revenueCatSignature(secret, timestamp, body);
  const header = `t=${timestamp},v1=${signature}`;
  assert(await verifyRevenueCatSignature(body, header, secret, nowMs), "valid signature should pass");
  assert(!await verifyRevenueCatSignature(new TextEncoder().encode('{"event":{"id":"evt_2"}}'), header, secret, nowMs), "tampered body should fail");
  assert(!await verifyRevenueCatSignature(body, header, secret, nowMs + 301_000), "stale signature should fail");
});

Deno.test("webhook signature accepts a valid v1 during signature rotation", async () => {
  const secret = "test-secret";
  const timestamp = "1787698800";
  const nowMs = Number(timestamp) * 1000;
  const body = new TextEncoder().encode('{"event":{"id":"evt_rotation"}}');
  const valid = await revenueCatSignature(secret, timestamp, body);
  const header = `t=${timestamp},v1=${"0".repeat(64)},v1=${valid}`;
  assert(await verifyRevenueCatSignature(body, header, secret, nowMs), "any valid v1 signature should pass");
});

Deno.test("stable user identity prefers a Supabase UUID over RevenueCat anonymous aliases", () => {
  const uuid = "2d931510-d99f-494a-8c67-87feb05e1594";
  const result = stableUserId({ app_user_id: "$RCAnonymousID:abc", aliases: ["$RCAnonymousID:def", uuid] });
  assert(result === uuid, "UUID alias should be selected");
});

Deno.test("transfer planning retains every distinct Cogni source and destination", () => {
  const sourceA = "2d931510-d99f-494a-8c67-87feb05e1594";
  const sourceB = "1269a9da-18f0-4e15-b410-58b155eb89b2";
  const destination = "a68591a7-e19a-4c90-99ce-c0822aff145e";
  const result = transferUserIds({
    app_user_id: destination,
    transferred_from: ["$RCAnonymousID:ignored", sourceA, sourceA, sourceB, destination],
    transferred_to: [destination, destination, "not-a-user"],
  });
  assert(result.sources.join(",") === `${sourceA},${sourceB}`, "all distinct former owners must be reconciled");
  assert(result.destinations.join(",") === destination, "the destination must be reconciled exactly once");
  assert(stableUserId({ transferred_from: [sourceA], transferred_to: [destination] }) === destination, "the destination should be the primary transfer identity");
});

Deno.test("transfer planning falls back to the destination app user id", () => {
  const destination = "a68591a7-e19a-4c90-99ce-c0822aff145e";
  const result = transferUserIds({ app_user_id: destination, transferred_from: [] });
  assert(result.destinations[0] === destination, "a valid transfer app user id should be treated as destination when the array is missing");
});

Deno.test("active subscription grants pro", () => {
  const now = Date.parse("2026-08-26T00:00:00Z");
  const result = projectProEntitlement({
    entitlements: { pro: { product_identifier: "cogni_pro_monthly", purchase_date: "2026-08-20T00:00:00Z", expires_date: "2026-09-20T00:00:00Z" } },
    subscriptions: { cogni_pro_monthly: { expires_date: "2026-09-20T00:00:00Z", is_sandbox: false, store: "play_store" } },
  }, "RENEWAL", "PRODUCTION", now);
  assert(result.isPro && result.status === "active" && result.store === "play_store", "active subscription should grant pro");
});

Deno.test("Android base-plan product suffix normalizes to the approved Cogni product", () => {
  const now = Date.parse("2026-08-26T00:00:00Z");
  const result = projectProEntitlement({
    entitlements: { pro: { product_identifier: "cogni_pro_annual:annual", expires_date: "2027-08-20T00:00:00Z" } },
    subscriptions: { "cogni_pro_annual:annual": { expires_date: "2027-08-20T00:00:00Z", is_sandbox: true, store: "play_store" } },
  }, "INITIAL_PURCHASE", "SANDBOX", now);
  assert(result.isPro && result.productId === "cogni_pro_annual", "approved base-plan suffix should normalize safely");
});

Deno.test("unrelated product cannot be projected as Cogni Pro", () => {
  const now = Date.parse("2026-08-26T00:00:00Z");
  const result = projectProEntitlement({
    entitlements: { pro: { product_identifier: "unrelated_premium", expires_date: "2099-01-01T00:00:00Z" } },
    subscriptions: { unrelated_premium: { expires_date: "2099-01-01T00:00:00Z", store: "app_store" } },
  }, "INITIAL_PURCHASE", "PRODUCTION", now);
  assert(!result.isPro && result.status === "unknown" && result.productId === null, "unapproved product must not grant or persist Cogni Pro");
});

Deno.test("cancelled subscription remains pro until expiration", () => {
  const now = Date.parse("2026-08-26T00:00:00Z");
  const result = projectProEntitlement({
    entitlements: { pro: { product_identifier: "cogni_pro_annual", expires_date: "2027-08-20T00:00:00Z" } },
    subscriptions: { cogni_pro_annual: { expires_date: "2027-08-20T00:00:00Z", unsubscribe_detected_at: "2026-08-25T00:00:00Z", store: "app_store" } },
  }, "CANCELLATION", "PRODUCTION", now);
  assert(result.isPro && result.status === "cancelled" && !result.willRenew, "cancelled but unexpired should retain access");
});

Deno.test("billing issue in grace retains access through grace expiration", () => {
  const now = Date.parse("2026-08-26T00:00:00Z");
  const result = projectProEntitlement({
    entitlements: { pro: { product_identifier: "cogni_pro_monthly", expires_date: "2026-08-25T00:00:00Z", grace_period_expires_date: "2026-08-30T00:00:00Z" } },
    subscriptions: { cogni_pro_monthly: { expires_date: "2026-08-25T00:00:00Z", grace_period_expires_date: "2026-08-30T00:00:00Z", billing_issues_detected_at: "2026-08-25T00:00:00Z", store: "play_store" } },
  }, "BILLING_ISSUE", "PRODUCTION", now);
  assert(result.isPro && result.status === "grace_period" && result.billingIssue, "grace period should retain access");
});

Deno.test("refund revokes access", () => {
  const now = Date.parse("2026-08-26T00:00:00Z");
  const result = projectProEntitlement({
    entitlements: { pro: { product_identifier: "cogni_pro_monthly", expires_date: "2026-09-20T00:00:00Z" } },
    subscriptions: { cogni_pro_monthly: { expires_date: "2026-09-20T00:00:00Z", refunded_at: "2026-08-25T00:00:00Z", store: "play_store" } },
  }, "REFUND", "PRODUCTION", now);
  assert(!result.isPro && result.status === "refunded", "refund should revoke pro");
});

Deno.test("a transfer source with no remaining subscription is revoked", () => {
  const result = projectProEntitlement({}, "TRANSFER", "PRODUCTION", Date.parse("2026-08-26T00:00:00Z"));
  assert(!result.isPro && result.status === "revoked", "former owners must not retain server-side Pro access after transfer");
});
