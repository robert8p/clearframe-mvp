# Cogni deployment — Expo / EAS + Supabase + RevenueCat

Cogni's active client is the Expo / React Native app in `mobile/`. Vercel is not an active mobile runtime or backend target.

## Active deployment path

- Expo / EAS builds the iOS/Android app.
- Supabase Auth provides identity.
- Supabase Edge Function `mobile-api` is the authenticated trusted mobile backend.
- Supabase Edge Function `revenuecat-webhook` receives verified subscription events.
- Supabase Postgres stores profiles, content, sessions, answers, scores, analytics and the server-owned entitlement projection.
- Apple App Store / Google Play process native subscriptions.
- RevenueCat normalises store subscription status and entitlement lifecycle.

`vercel.json` disables Vercel Git deployments. Do not re-enable them.

## 0.4.0 version / identity

- App version: `0.4.0`
- Android package: `app.gocogni.cogni`
- iOS bundle identifier: `app.gocogni.cogni`
- Expo project: `24fc0fea-5e66-4365-a82c-ac668aded7d0`
- Android versionCode for the submitted 0.4.0 build must be greater than the verified 0.3.3 value `36`.

Never reuse a 0.3.3 binary as a 0.4.0 candidate.

## Environment variables

Mobile/public EAS variables only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`

The RevenueCat SDK keys above are designed to be public client identifiers. Do not place RevenueCat secret API/webhook keys in `EXPO_PUBLIC_*` variables.

Supabase Edge/server secrets:

- `REVENUECAT_SECRET_API_KEY`
- `REVENUECAT_WEBHOOK_HMAC_SECRET`
- `REVENUECAT_WEBHOOK_AUTHORIZATION`

Set all three server secrets before distributing a 0.4.0 build containing a RevenueCat public SDK key. `REVENUECAT_WEBHOOK_AUTHORIZATION` is technically optional at RevenueCat, but Cogni's production setup requires it as an independent check in addition to HMAC.

## Database and Edge Functions

The production-ledger-aligned 0.4.0 additive migration is:

`supabase/migrations/20260825234024_cogni_monetisation_foundation.sql`

It creates server-owned entitlement, webhook-idempotency and monetisation-config state. Production defaults to `monetization_enabled = false` so 0.3.3 behavior is not paywalled during store setup.

Deploy/check:

- authenticated `mobile-api` including `monetization.ts`, `progress-history.ts` and `support.ts`;
- public-JWT-disabled `revenuecat-webhook` using its own raw-body HMAC and Authorization verification.

Do not enable monetisation until RevenueCat server secrets, store products, offerings and store-installed sandbox purchases have been tested.

## Account deletion sequencing

When RevenueCat is configured, `mobile-api` first deletes the RevenueCat Customer by the stable Supabase UUID and only then deletes the Supabase Auth user. A RevenueCat failure leaves the Cogni account intact and returns a retryable error rather than falsely claiming complete deletion. The subsequent Auth deletion cascades Cogni-side learning and entitlement rows.

Deleting the RevenueCat Customer or Cogni account does not cancel an Apple App Store or Google Play subscription. Users must manage renewal separately in the store. Configure the RevenueCat server secret before distributing the RevenueCat-enabled client so this privacy path is always available.

## Before every mobile build

From `mobile/`, the maintained CI runs strict dependency install, Expo dependency check, ESLint, UI audit, logic/security/auth/monetisation audits and TypeScript. It additionally:

- scans mobile source for server-only RevenueCat/Supabase secret references;
- rejects dynamic `process.env[...]` lookups;
- exports an Android production bundle with public Supabase/RevenueCat test values and verifies they are compiled;
- checks for server-only secret identifiers in the bundle;
- Deno-typechecks both Edge Functions;
- runs context-engine behavior tests;
- runs server-authoritative entitlement failure-mode tests;
- runs RevenueCat HMAC/entitlement-projection security tests.

All gates must pass before an EAS candidate is treated as buildable.

## Android candidate sequence

1. Build an installable preview APK for non-store regression testing if needed.
2. Inspect the exact APK for package/version/signing/permissions/configuration and server-secret absence.
3. Clean-install and execute that exact APK; run free flows plus paywall/error paths that do not require real Google Play billing.
4. Build a production AAB from the same reviewed source revision with a new versionCode greater than 36.
5. Upload the exact AAB to Google Play Internal Testing or Closed Testing.
6. Install Cogni from Google Play—not from a sideload—for billing validation.
7. Test monthly/annual purchase, store-derived pricing, any configured eligible offer, immediate server entitlement, restore, reinstall, second sign-in/session, cancellation-still-active, and practical expiry/refund/billing-error paths.
8. Only the tested store-installed artifact can be promoted.

A sideloaded APK cannot prove Google Play Billing.

## iOS candidate sequence

1. Build the same 0.4.0 source for iOS through EAS with the Apple RevenueCat public key available at build time.
2. Upload to App Store Connect/TestFlight.
3. Configure real App Store Connect subscription products and RevenueCat connection.
4. Test through StoreKit sandbox/TestFlight: monthly/annual purchase, eligible introductory offer if one exists, server entitlement activation, restore, reinstall/another session, cancellation and available renewal/expiry/refund scenarios.
5. Only then mark Apple billing tested.

## RevenueCat configuration contract

- entitlement: `pro`
- offering: `default`
- monthly product: `cogni_pro_monthly`
- annual product: `cogni_pro_annual`
- RevenueCat App User ID: authenticated Supabase user UUID

The app fetches prices/offers from the active RevenueCat/store offering. It rejects packages whose store product identifier is not one of the two approved product IDs. Do not hardcode display prices in mobile source.

## GitHub Pages legal site

The static legal/support site is in `/docs`. Once GitHub Pages is enabled from the `main` branch `/docs` folder, expected URLs are:

- `/privacy.html`
- `/terms.html`
- `/subscriptions.html`
- `/support.html`
- `/delete-account.html`

A private customer-support contact still must be added before public paid launch.

## Exact-artifact release rule

A build is not validated because TypeScript, CI, Gradle or EAS says it succeeded. Every candidate must be tied to source commit + build ID + package/bundle identity + version/build number + hash where obtainable + signature/certificate evidence + executed critical-flow evidence.

If the candidate is rebuilt after testing, it is a new untested artifact and must be exercised again.

## Vercel decommission status

- New Vercel Git deployments: disabled.
- Active product client: Expo only.
- Active backend: Supabase Edge Functions/Postgres.
- Subscription service: RevenueCat + Apple/Google stores.
- New mobile dependency on Vercel: none.
