# Cogni deployment and release

Last updated: 1 September 2026

## Release branches

- Verified rollback baseline: `main` at Cogni 0.3.3 commit `d6e3faa54360c28e1b7783d5b9e025cf8a1ed40d`
- Monetisation candidate: `feat/cogni-0.4.0-monetisation`
- Review: draft PR #28

Do not overwrite or relabel the 0.3.3 evidence. Do not merge 0.4.0 until its own source, binary, runtime and store-specific gates are recorded.

## Application identity

- App version: `0.4.0`
- Android application ID: `app.gocogni.cogni`
- iOS bundle identifier: `app.gocogni.cogni`
- Expo / EAS project ID: `24fc0fea-5e66-4365-a82c-ac668aded7d0`
- Supabase project: `dhklfrqhsmofqrawfdjz`
- EAS version source: remote
- Android release version code: must be greater than 36

## Database migrations

Production contains both tracked monetisation migrations:

1. `20260825234024_cogni_monetisation_foundation.sql`
2. `20260831190000_cogni_monetisation_hardening.sql`

The foundation creates the entitlement projection, webhook event ledger, remote configuration, support queue and service-role entitlement sync. The hardening migration adds atomic transfer reconciliation, complete daily progress-history projection, a missing webhook foreign-key index and explicit server-only support grants.

Migrations are idempotent where practical, but must still be applied through the Supabase migration system rather than copied into the SQL editor.

## Edge Functions

Two functions are deployed from the matching candidate backend source:

### `mobile-api`

- Supabase JWT gateway verification is enabled.
- The function also derives the authenticated user from the presented token before handling protected routes.
- It includes `engine.ts`, `monetization.ts`, `progress-history.ts`, `support.ts`, `index.ts` and `deno.json`.
- It preserves the 0.3.3 routes and adds entitlement state/sync, progress history and private support routes.

### `revenuecat-webhook`

- Supabase JWT gateway verification is disabled because RevenueCat is not a Supabase user.
- The function performs its own Authorization and HMAC signature checks before parsing or processing an event.
- It includes `logic.ts`, `index.ts` and `deno.json`.
- It rejects requests until all custom webhook and RevenueCat server secrets are present.

## Supabase server secrets

These values belong in the Supabase Edge Functions secret dashboard, never in Expo, GitHub source or a mobile bundle:

- `REVENUECAT_SECRET_API_KEY`
- `REVENUECAT_WEBHOOK_AUTHORIZATION`
- `REVENUECAT_WEBHOOK_HMAC_SECRET`

Webhook endpoint:

`https://dhklfrqhsmofqrawfdjz.supabase.co/functions/v1/revenuecat-webhook`

Keep `public.monetization_config.monetization_enabled = false` until RevenueCat, at least one selected launch store, webhook authentication and real store-installed sandbox purchases are proven.

## Public mobile build values

- `EXPO_PUBLIC_SUPABASE_URL=https://dhklfrqhsmofqrawfdjz.supabase.co`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<current publishable key>`
- `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=<RevenueCat Android public SDK key>`
- `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=<RevenueCat iOS public SDK key>`

RevenueCat SDK keys are intentionally public platform client keys. Server keys and webhook secrets must not use `EXPO_PUBLIC_`.

For the exact store-candidate workflow, store the platform client keys as GitHub Actions secrets:

- `REVENUECAT_GOOGLE_PUBLIC_API_KEY`
- `REVENUECAT_APPLE_PUBLIC_API_KEY`

The workflow injects only the selected public key into a temporary build profile. It never commits the value to source.

The pre-store exact APK deliberately omits RevenueCat SDK keys to verify the safe no-offering state. That APK is not evidence that Play or App Store billing works.

## Source quality gate

`mobile-ci.yml` validates:

- clean dependency install and Expo compatibility;
- ESLint and accessibility/UI audit;
- TypeScript;
- auth, privilege and monetisation static audits;
- Android bundle embedding of static Supabase values;
- absence of server-only billing secrets in executable output;
- `mobile-api` typecheck and behaviour tests;
- RevenueCat webhook typecheck, HMAC, transfer and entitlement projection tests.

A green source gate is not a release artifact.

## Exact pre-store Android gate

`cogni-0.4.0-exact-apk.yml` builds one fresh signed APK with the existing remote Cogni Android credentials and then operates on that same file:

1. records the candidate source commit;
2. checks version name `0.4.0` and version code greater than 36;
3. verifies `app.gocogni.cogni` and the established signing certificate;
4. verifies v2 signing, 16 KB alignment, required ABIs, target SDK and permissions;
5. proves the production Supabase URL/key are embedded;
6. proves server-only RevenueCat/Supabase secrets are absent;
7. records SHA-256 and metadata;
8. uploads the exact APK;
9. clean-installs the downloaded artifact on Android 16;
10. exercises Welcome, password recovery, authentication, all primary tabs, force-stop/relaunch, deep links, sign-out, signup/onboarding/account deletion and the dismissible no-store-key paywall;
11. deletes and independently verifies deletion of its disposable test account;
12. uploads screenshots, UI dumps and logcat evidence.

If this workflow rebuilds, the old runtime evidence does not transfer to the new bytes.

## Exact Google Play and TestFlight candidates

`cogni-store-candidates.yml` builds the actual store archives from one immutable source commit after public RevenueCat keys and store credentials exist.

Before the PR is merged:

1. add the relevant GitHub Actions secret or secrets;
2. leave monetisation disabled in production;
3. open draft PR #28;
4. click **Ready for review** only when the platform credentials are ready;
5. the workflow detects the configured platform keys and runs the corresponding build;
6. download the exact archived AAB and/or IPA evidence from that workflow run;
7. submit those exact bytes to Play Internal Testing and/or TestFlight;
8. do not rebuild after testing and call the replacement tested.

After the workflow exists on `main`, it can also be started from **Actions → Cogni exact store candidates → Run workflow**.

### Android AAB controls

The workflow:

- requires a RevenueCat Google public SDK key beginning `goog_`;
- builds the EAS production Android profile as an AAB;
- downloads the exact EAS result;
- validates it with Bundletool;
- checks package, version, version code, target SDK, Billing permission and `singleTop` launch mode;
- checks the established Cogni signing certificate;
- proves the public RevenueCat key and production Supabase values are embedded;
- rejects server-only secrets;
- records the AAB SHA-256 and source commit;
- preserves the exact AAB as a GitHub Actions artifact.

### iOS IPA controls

The workflow:

- requires a RevenueCat Apple public SDK key beginning `appl_`;
- builds the EAS production iOS profile;
- downloads the exact EAS result;
- checks bundle identifier, marketing version and build number;
- proves the public RevenueCat key and production Supabase values are embedded;
- rejects server-only secrets;
- records the IPA SHA-256 and source commit;
- preserves the exact IPA as a GitHub Actions artifact.

## Google Play validation

After the Android app, subscriptions and RevenueCat connection are configured:

- upload the exact AAB to Google Play Internal Testing or Closed Testing;
- install Cogni from the Play test link, not by sideloading;
- test monthly and annual purchase, cancellation, restore, reinstall, second session/device, cancellation while active, billing issue/grace where practical, expiry/revocation, no-offering and offline/error states;
- reconcile RevenueCat customer state, Supabase entitlement state and app UI for each lifecycle case;
- use a valid free bearer token to confirm direct premium API calls are denied.

A sideloaded APK cannot prove Google Play Billing.

## iOS validation

After Apple Developer/App Store Connect and RevenueCat iOS configuration:

- upload the exact build to App Store Connect/TestFlight;
- install through TestFlight or an approved StoreKit sandbox route;
- test the real monthly and annual products;
- verify purchase, cancellation, restore, reinstall, second session/device, cancellation while active and expiry/revocation reconciliation;
- use a valid free bearer token to confirm direct premium API calls are denied.

No iOS billing status may be claimed without those tests.

## Legal site

`legal-pages.yml` deploys the static files under `docs/` to GitHub Pages. It is separate from the mobile runtime. Store records use the resulting Privacy, Terms, Subscription Terms, Support and account-deletion URLs.

Final public store metadata must include a real operator/developer identity and signed-out support contact. Do not substitute a GitHub issue tracker. Obtain formal legal review before broad public paid launch.

## Enabling monetisation

Only after the selected launch stores and server lifecycle tests are healthy:

1. confirm RevenueCat `default` contains exact monthly and annual packages;
2. confirm both products attach to entitlement `pro`;
3. confirm webhook HMAC and Authorization tests return 200 and duplicate delivery is harmless;
4. confirm free users are denied direct protected API calls;
5. confirm paid sandbox users receive server Pro access;
6. enable monetisation through a reviewed Supabase migration/change;
7. repeat a free daily-learning and paid focused-practice smoke test.

## How to release future Cogni versions

1. Branch from the latest verified `main`.
2. Increase the app version and both store build numbers.
3. Run source CI.
4. Build, inspect and execute the exact Android APK regression candidate.
5. Build the exact Android AAB and iOS IPA from the approved source.
6. Install those archives through Play and TestFlight.
7. Run free, purchase, restore, offline, lifecycle and direct-API-bypass tests.
8. Record source commit, store build IDs, hashes, signatures and evidence.
9. Merge only after the applicable release gates pass.
10. Submit the already-tested store archives and confirm RevenueCat/Supabase entitlement health.

## Rollback

If 0.4.0 regresses the core product:

- keep monetisation disabled;
- withdraw the 0.4.0 store test build rather than altering the 0.3.3 evidence;
- fix the feature branch and build a new version code;
- retest the replacement exact artifact.

Server entitlement tables may remain in place while disabled; they do not paywall the 0.3.3 client.
