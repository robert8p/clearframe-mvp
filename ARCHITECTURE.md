# Cogni architecture

Last updated: 31 August 2026

## Active product

Cogni is an Expo / React Native mobile application. The active client is `mobile/`; the legacy web source is not a mobile-runtime dependency.

- Expo Router / Expo SDK 54 generation
- React Native 0.81
- Supabase Auth and Postgres
- Authenticated Supabase Edge Function `mobile-api`
- RevenueCat React Native SDK for Apple App Store and Google Play subscriptions
- Server-authoritative subscription projection in Supabase
- EAS-managed Android signing credentials and store builds

The verified Cogni 0.3.3 release at main commit `d6e3faa54360c28e1b7783d5b9e025cf8a1ed40d` remains the rollback baseline while 0.4.0 is developed on `feat/cogni-0.4.0-monetisation`.

## Mobile configuration and session boundary

`mobile/lib/supabase.ts` statically references:

- `process.env.EXPO_PUBLIC_SUPABASE_URL`
- `process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Static references are a release invariant because Metro must embed those public values into the production bundle. Dynamic `process.env[name]` lookup is prohibited by CI.

Supabase sessions are stored through native secure storage with a crash-safe in-memory fallback. The app's signed-out root remains Welcome; password reset is an explicit route and must never become the default fallback.

## API flow

```text
Cogni mobile app
  -> Supabase Auth access token
  -> mobile-api Edge Function
  -> server-side validation / authorisation
  -> Postgres
```

Answer keys, grading, Development Score updates and privileged writes remain server-side. The client cannot write trusted score or entitlement state.

## Monetisation flow

```text
Apple App Store / Google Play
  -> RevenueCat store receipt and subscription state
  -> RevenueCat CustomerInfo for device purchase UX
  -> RevenueCat signed webhook / server subscriber lookup
  -> Supabase subscription_entitlements
  -> mobile-api premium authorisation
```

The RevenueCat client result improves immediate UX but is not the authority for premium API access. Protected routes call the server entitlement layer. A forged local `isPro` value does not unlock protected functionality.

### RevenueCat identity

Cogni identifies RevenueCat customers with the stable Supabase user UUID. It uses custom IDs only and does not create a RevenueCat anonymous identity during Cogni sign-out. A subsequent Cogni sign-in switches RevenueCat directly to the new authenticated UUID.

### RevenueCat objects

- Entitlement: `pro`
- Offering: `default`
- Products: `cogni_pro_monthly`, `cogni_pro_annual`
- Packages: monthly and annual

The paywall reads localised price, period and eligible store offer information from RevenueCat. Prices are never hardcoded in executable UI source.

## Free and Cogni Pro

Free remains a useful learning product:

- account creation, authentication and password recovery
- onboarding and starting check
- Home and current daily lesson
- one assigned core training session per day
- basic Skills and Progress views
- XP, streak, profile, support, privacy and account deletion

Cogni Pro adds:

- unlimited additional focused skill practice
- intentional skill selection
- complete available daily skill-progress history and trend insights

Focused-practice creation and answer submission are both checked by `mobile-api`. The basic daily session is not routed through the Pro gate.

## Supabase subscription model

`public.subscription_entitlements` is a server-owned projection keyed by `(user_id, entitlement)`. It records status, product, store, purchase and expiry dates, renewal/billing state, environment and last processed event.

`public.subscription_webhook_events` is a minimal idempotency and audit ledger. It stores an event ID, type, environment and payload hash—not the full receipt or payment-card data.

`public.monetization_config` is a deliberately small server-owned configuration table. Its production default is disabled. When disabled, the free core and current focused practice remain available, allowing 0.3.3 clients to continue operating while 0.4.0 is configured and tested.

## Webhook security and lifecycle

The public `revenuecat-webhook` Edge Function uses custom authentication rather than a Supabase user JWT. It requires:

1. an exact independent `Authorization` value;
2. RevenueCat HMAC-SHA256 verification over the raw request bytes;
3. a recent signature timestamp;
4. a unique RevenueCat event ID.

For ordinary lifecycle events, the function refetches canonical subscriber state before projecting access. For `TRANSFER`, every known former Cogni user ID is revoked directly, the destination is refetched with brief retry protection, and all source/destination projections are committed atomically by `sync_subscription_transfer` under one event claim.

Active, cancelled-but-unexpired, grace-period and valid billing-issue states can retain access until the effective expiry. Expired, refunded and revoked states do not.

## Progress history

`get_user_skill_progress_history` is a service-role-only, `SECURITY DEFINER`, empty-`search_path` SQL function that returns the latest skill snapshot per UTC day. Free receives the configured recent window; Pro receives all available daily snapshots. There is no hidden one-year or 5,000-row Pro cap.

## Account deletion and subscriptions

Account deletion first requests deletion of the Cogni RevenueCat customer record, then deletes the Supabase user and dependent Cogni data. Deleting Cogni does not cancel a store subscription. The UI and legal pages direct the user to Apple or Google subscription management for cancellation.

Financial transaction history retained by Apple, Google or RevenueCat is governed by those providers' legal and store obligations; Cogni does not claim to erase store records it does not control.

## Legal and support surface

Authenticated users can submit private support requests through `mobile-api`. `support_requests` is server-only; ordinary client roles have no table privileges.

The public Privacy, Terms, Subscription Terms, Support and account-deletion pages live in `docs/` and are deployed independently as static GitHub Pages content. They are not required by the mobile runtime.

## Release architecture

- `main` remains the verified 0.3.3 baseline until 0.4.0 gates pass.
- Source CI validates dependencies, lint, accessibility/UI rules, TypeScript, bundle configuration, secret absence, Edge Function typechecks and security/behaviour tests.
- The exact-APK workflow builds a fresh signed 0.4.0 APK, inspects those exact bytes, installs the same artifact on Android 16 and runs free/auth/paywall regression flows.
- Google Play billing is validated only from a Play-installed internal/closed-test AAB.
- Apple billing is validated only through StoreKit sandbox/TestFlight with real App Store Connect products.

A rebuilt binary is a new artifact and must repeat the relevant binary and runtime gates.
