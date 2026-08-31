# Cogni security

## Active mobile security boundary

- Supabase RLS is enabled on user-facing tables.
- Authenticated users can read only their own user-scoped profile/evidence rows.
- Authenticated clients cannot directly edit privileged profile fields such as admin state, XP or streaks.
- Published challenge prompts and skills are readable where required by the product; answer keys remain isolated from authenticated-client reads.
- Supabase secret/service-role credentials exist only in trusted Edge/server environments and are never bundled into Expo.
- The Expo app stores Supabase auth sessions in native SecureStore.
- Mobile API calls require a valid Supabase JWT and are rate-limited per user.
- The production rate-limit RPC remains a narrowly exposed `SECURITY DEFINER` function owned by `postgres`, with empty `search_path`; ordinary roles receive no direct private-schema access.
- Profile mutation, grading, XP/streak awards, session creation and account deletion run through the authenticated `mobile-api` Edge Function.
- Scoring uses a transactional Postgres function with per-user concurrency protection.
- Unexpected server/database errors are logged server-side and returned as sanitized responses.
- The active mobile source contains no Vercel runtime dependency and no silent production-backend fallback.

## Subscription and premium-access boundary

- The mobile app contains only RevenueCat **public SDK keys** (`EXPO_PUBLIC_REVENUECAT_*`). RevenueCat secret API keys and webhook secrets are server-only Supabase secrets.
- RevenueCat customers use the stable authenticated Supabase user UUID. Cogni does not normally create RevenueCat anonymous identities.
- Local RevenueCat `CustomerInfo` improves UX but is not the authority for protected server resources.
- Only the exact `cogni_pro_monthly` and `cogni_pro_annual` store products can be mapped to Cogni Pro. A misconfigured unrelated package is ignored.
- `public.subscription_entitlements` is server-owned. Authenticated users can select only their own row; they cannot insert, update or delete entitlement state.
- `public.subscription_webhook_events` and `public.monetization_config` expose no authenticated client privileges.
- `public.sync_subscription_entitlement(...)` is `SECURITY DEFINER`, owned by `postgres`, uses empty `search_path`, is revoked from `public`, `anon` and `authenticated`, and is executable by `service_role` only.
- `revenuecat-webhook` does not rely on a public JWT. It verifies RevenueCat's HMAC signature against the raw request bytes before parsing JSON, applies a bounded timestamp/replay window, and requires a separately configured Authorization value for production.
- Webhook IDs are unique/idempotent. Replayed or duplicate events cannot repeatedly mutate entitlement state.
- The webhook refetches current RevenueCat subscriber state instead of trusting event fields alone for final access projection.
- Unknown/deleted Cogni UUIDs are acknowledged without recreating user accounts.
- Premium server checks are performed both when focused-practice sessions are requested and when practice answers are submitted, preventing replay of an old premium session after entitlement expiry.
- Refunded, revoked and expired states do not grant premium access. Cancelled-but-unexpired and verified grace/billing-recovery states grant access only through verified expiry.
- A local forged `isPro=true` value cannot grant protected API access.

## Subscription availability failure mode

`monetization_enabled` defaults to false until store testing is complete. A positively read disabled configuration keeps existing free behavior open even if the unused entitlement table is temporarily unavailable. Once monetisation is enabled, inability to read either configuration or entitlement state is a retryable billing-verification outage—not proof of free access. Protected routes fail closed; core free learning does not require RevenueCat availability.

## Auth account lifecycle

The native app includes email confirmation deep links, password recovery/update, sign out and authenticated permanent account deletion.

When RevenueCat is configured, account deletion first calls the server-only RevenueCat customer-deletion API using the authenticated Supabase UUID. Only after that succeeds does `mobile-api` delete the Supabase Auth identity, cascading Cogni-side learning and entitlement rows. A RevenueCat failure leaves the Cogni account intact and returns a retryable error rather than reporting partial deletion as complete.

Deleting the RevenueCat Customer or Cogni account does **not** cancel an App Store or Google Play subscription. The UI and public account-deletion page direct users to store subscription management. Apple, Google and any legally required provider transaction records remain governed by those providers.

Before public release, confirm Supabase Auth allows the native redirect scheme `cogni://**` (or exact confirmation/recovery routes).

## CI security gates

Mobile CI checks:

- static Expo environment references (no `process.env[name]`-style dynamic lookup regression);
- only public RevenueCat SDK-key variables exist in mobile source;
- server-only RevenueCat/Supabase secret names do not appear in mobile source;
- an exported Android JS bundle contains expected public Supabase/RevenueCat configuration and no server-only secret identifiers;
- exact app identity, product IDs, paywall disclosures, entitlement route ordering and account-deletion ordering;
- `mobile-api` and `revenuecat-webhook` typecheck under Deno;
- protected server routes fail closed for unknown configuration and deny free users when enabled;
- RevenueCat HMAC validation rejects tampering and stale signatures;
- entitlement projection tests cover active, cancelled, grace/billing, expiry, refund and unsupported-product paths.

## Remaining public-launch security gates

- Enable Supabase Auth leaked-password protection if still disabled.
- Configure and rotate RevenueCat server/webhook secrets in Supabase before billing activation.
- Confirm exact-binary secret scanning after EAS build.
- Run direct free-token premium-route denial and verified-Pro route access tests against the store-integrated candidate.
- Test invalid/duplicate RevenueCat webhooks against the deployed endpoint after secrets are configured.
- Complete production monitoring/alerting and security review proportionate to launch scale.
- Treat retained legacy web/admin source as a separate attack surface and remove it once no longer required.
