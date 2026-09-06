# Cogni security

Last updated: 31 August 2026

## Security position

Cogni 0.4.0 keeps learning, identity and subscription authority on trusted server boundaries. A mobile client is treated as user-controlled and potentially modified.

## Public mobile configuration

The compiled app contains only public client configuration:

- Supabase project URL
- Supabase publishable key
- one RevenueCat public SDK key for the relevant platform, once configured

These values are expected to be discoverable in an APK/IPA. They are not server credentials.

The following must never be embedded in the mobile bundle or committed as client configuration:

- Supabase secret/service-role keys
- RevenueCat secret API key
- RevenueCat webhook Authorization value
- RevenueCat HMAC signing secret
- store service-account or App Store Connect private keys

CI inspects source and the exported Android bundle for server-secret identifiers and repeats the static Expo public-variable regression check.

## Authentication and routing

- Supabase Auth owns identity and access tokens.
- The app stores sessions in native secure storage with a non-crashing memory fallback.
- `mobile-api` independently validates the bearer token before user-specific work.
- Welcome remains the fresh signed-out route.
- Password reset is explicit and cannot become the default screen after force-stop/relaunch.
- Primary buttons must navigate, show progress or return visible validation.

## Learning-data authority

Answer keys do not ship to the mobile client. Answer grading, XP, streak and Development Score writes occur in `mobile-api`. The Development Score remains an adaptive learning indicator with separate evidence reliability; it is not an IQ, population percentile, diagnosis, employment assessment or permanent grade.

## Subscription authority

RevenueCat `CustomerInfo` is used for store interaction and responsive UI, but protected server functionality is authorised from `public.subscription_entitlements`.

Every Pro operation must satisfy both layers:

1. the UI intentionally exposes the feature or paywall;
2. the server checks the current Supabase entitlement projection.

A forged local `isPro=true`, modified navigation state or direct API call with a valid free-user token cannot create or answer focused-practice sessions after monetisation is enabled.

When entitlement state or monetisation configuration cannot be verified, protected routes fail closed with a structured temporary billing-unavailable response. Core free learning fails open because it is not routed through a Pro gate.

## Entitlement database controls

- `subscription_entitlements` uses RLS; authenticated users may read only their own row.
- `anon` and `authenticated` cannot insert, update or delete entitlements.
- `subscription_webhook_events` is inaccessible to ordinary clients.
- `monetization_config` is readable through trusted server logic, not writable by clients.
- `support_requests` is server-only and direct client grants are revoked.
- entitlement sync, transfer sync and daily progress-history projection are `SECURITY DEFINER`, owned by `postgres`, use an empty `search_path`, and are executable only by `service_role`.

## RevenueCat webhook controls

`revenuecat-webhook` has Supabase JWT verification disabled intentionally because it is a third-party callback. The function provides its own stronger boundary:

- exact independent Authorization header comparison;
- raw-body RevenueCat HMAC verification;
- five-minute timestamp tolerance;
- constant-time signature comparison;
- event-ID idempotency;
- payload hash retention without storing the raw receipt;
- canonical subscriber refetch for ordinary events;
- direct revocation of every valid `transferred_from` Cogni UUID;
- brief retry when the transfer destination projection is temporarily unavailable;
- one atomic database transaction for all transfer identities.

Unknown/deleted Cogni users are recorded as ignored rather than recreated.

## Subscription state rules

Server access is granted only when:

- entitlement is exactly `pro`;
- product is exactly `cogni_pro_monthly` or `cogni_pro_annual` (Android base-plan suffixes are normalised to the approved product);
- state is active, cancelled-but-unexpired, grace period, or valid billing issue;
- effective expiry is in the future;
- no refund or revocation applies.

Expired/refunded/revoked subscriptions cannot retain server Pro access.

## Account deletion

The account-deletion API attempts RevenueCat customer deletion before removing the Supabase identity. If the RevenueCat privacy deletion cannot be completed when monetisation is configured, deletion returns a visible retryable error rather than claiming completion.

Deleting a Cogni account does not cancel an Apple or Google subscription. Users must manage/cancel the subscription in the relevant store. The app and public deletion page state this explicitly.

## Payment data

Cogni does not collect or store payment-card data. Apple and Google process store payments. Cogni stores only the minimum entitlement metadata needed to operate access and support lifecycle reconciliation.

## Release checks

Source checks are necessary but not sufficient. Each candidate must also prove:

- package and version identity;
- signing certificate;
- embedded public configuration;
- absence of server secrets;
- archive integrity and required ABIs;
- real cold launch and critical flows on the exact APK;
- Play-installed purchase/restore/lifecycle tests before Android paid launch;
- TestFlight/StoreKit purchase/restore/lifecycle tests before iOS paid launch.

## Unresolved external controls

The following cannot be honestly claimed from source/database inspection alone and remain external release gates until verified:

- Supabase Auth leaked-password protection enabled;
- RevenueCat project/store credentials and webhook secrets configured;
- Google Play service-account/API connection and real subscription products;
- App Store Connect subscription products and agreements;
- Play/TestFlight sandbox purchase evidence;
- final legal operator identity and professional legal review for a broad public paid launch.
