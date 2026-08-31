# Cogni architecture — active mobile 0.4.0

The production product is the Expo / React Native application in `mobile/`, backed by Supabase Auth, Postgres and authenticated Edge Functions. Retained legacy web/admin source is not the active mobile runtime and must not be treated as the deployment architecture.

## Runtime boundary

`Expo mobile app -> Supabase Auth -> authenticated mobile-api Edge Function -> Postgres`

The mobile client uses the Supabase publishable key only. Sensitive grading, score mutation, XP/streak updates, session creation, account deletion and premium API enforcement happen server-side.

Answer keys are not shipped in the app. User-scoped tables use RLS and the mobile API performs privileged operations with server credentials after authenticating the user.

## Daily free learning flow

`Welcome/Auth -> Onboarding -> Starting Check -> Daily Lesson -> Assigned Core Training -> Daily Complete`

The starting check, current daily lesson, one assigned core training experience, basic Skills, basic Progress, XP/streaks and account/privacy controls are part of the free product.

## Cogni Pro subscription architecture

`Apple App Store / Google Play -> RevenueCat -> Cogni mobile client -> Supabase server entitlement projection -> protected premium API`

- Native purchases use `react-native-purchases` / RevenueCat.
- Cogni identifies RevenueCat customers with the authenticated Supabase user UUID. The app avoids RevenueCat anonymous identities for normal authenticated use.
- Store-derived offerings provide local price, currency, billing period and eligible introductory-offer data. Cogni does not hardcode displayed subscription prices.
- Only the exact `cogni_pro_monthly` and `cogni_pro_annual` products are accepted into the paywall or projected as Cogni Pro.
- `public.subscription_entitlements` is the server-owned entitlement projection. Authenticated users may read only their own row; clients cannot write subscription state.
- `revenuecat-webhook` validates RevenueCat's HMAC signature over the raw body plus a separate Authorization value, then fetches current RevenueCat subscriber state and atomically projects it through the service-role-only `sync_subscription_entitlement` function.
- Webhook event IDs are persisted for idempotency. Duplicate deliveries are harmless.
- `mobile-api` independently checks the server entitlement before protected premium work. A forged local `isPro` value cannot unlock premium API operations.
- Refunded/revoked/expired entitlements do not retain protected access. Cancelled subscriptions remain active only through verified expiry. Supported grace/billing-recovery states can retain access through verified expiry.

## Initial Free / Pro boundary

Free:
- account/auth/password recovery/onboarding/account deletion;
- starting check;
- daily lesson and assigned core training;
- basic Skills map;
- current/basic Progress snapshot;
- most recent progress-history window configured by the server (default 7 days);
- XP/streak/profile/privacy controls.

Cogni Pro:
- unlimited additional focused skill practice;
- choose any available skill for focused practice;
- full available progress-history trends in the mobile view (currently capped to one year for response size/performance).

The remote configuration in `public.monetization_config` controls only a small set of monetisation rules. It defaults to `monetization_enabled = false`; this keeps the verified 0.3.3 baseline unaffected while 0.4.0 store setup and testing are incomplete.

## Subscription failure behaviour

A positively read disabled monetisation configuration preserves the existing free product without depending on RevenueCat. Once monetisation is enabled, a subscription-system/configuration outage is not interpreted as “free user.” Protected premium requests return a retryable billing-unavailable response instead of opening or creating premium work. Core free learning remains independent of RevenueCat availability.

## Account deletion architecture

When RevenueCat is configured, the authenticated account-deletion operation first calls RevenueCat's server-only Customer deletion API using the Supabase UUID. It then deletes the Supabase Auth identity, which cascades Cogni-side learning and entitlement records. If external deletion fails, Cogni leaves the account intact and reports a retryable failure instead of claiming deletion completed. Store subscriptions are managed separately and are not cancelled by deleting Cogni or the RevenueCat Customer.

## Analytics

Authoritative learning metrics remain server-based. Monetisation client events are allow-listed and written through `mobile-api`; entitlement activation/expiry/revocation events are emitted by the server projection. Payment-card information is never included.

## Release architecture

- EAS builds the native Android/iOS binaries.
- Android real-billing validation must use a Google Play-installed internal/closed-test build.
- iOS real-billing validation must use StoreKit sandbox/TestFlight with App Store Connect products.
- A sideloaded APK is useful for regression testing but cannot prove store billing.
- The exact binary offered for testing/submission must be the same artifact whose package/version/configuration and critical flows were exercised.

The verified Cogni 0.3.3 evidence remains the rollback/source baseline until 0.4.0 passes its own gates.
