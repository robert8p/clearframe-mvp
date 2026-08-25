# Cogni 0.3.3 verified Expo release

Last verified: 26 August 2026

## Verdict

**PASS — Expo-hosted internal Android APK ready for Samsung installation.**

This release was not rebuilt after testing. The exact signed APK that passed the complete Android interaction suite was uploaded to Expo, downloaded back from Expo, and compared byte-for-byte with the tested source artifact before the Expo-hosted copy was exercised again on Android 16.

## Release identity

- App version: **0.3.3**
- Android version code: **36**
- Package: `app.gocogni.cogni`
- APK SHA-256: `840d33da0173f2b6b7a64b9786923b0de5242bf56581ac798bab347b71c07bd8`
- Tested PR head: `b7160b52335eb497c22602220fc5d5b590b791cf`
- Exact APK source commit recorded in build metadata: `1e3ba7ebf4f7a6430cd461cb4a248aaa4db06a20`
- Product merge commit: `20150aaed5b62d9207b40240fdf81133c6b4a808`
- Exact APK source-artifact run: `32906341288`
- Expo upload and hosted-copy verification run: `32908753285`

## Expo distribution

- Expo build ID: `57914ee6-a7b3-4498-9d80-b0e26374af40`
- Expo build page: `https://expo.dev/accounts/cogniapp/projects/cogni/builds/57914ee6-a7b3-4498-9d80-b0e26374af40`
- Expo APK artifact: `https://expo.dev/artifacts/eas/cj4Npr34gSmqKNhTVhzPX9xMDndbsdvEK2e6-PHJXtE.apk`

## Source and binary gates passed

- strict dependency installation;
- Expo dependency compatibility;
- ESLint;
- UI/accessibility audit;
- application logic/security audit;
- backend privilege audit;
- authentication-route audit;
- TypeScript;
- production Android bundle configuration smoke test;
- Supabase Edge Function typecheck;
- contextual-learning behavioural tests;
- clean signed Android APK build;
- APK archive integrity;
- package, version and version-code identity;
- APK Signature Scheme v2;
- established Cogni signing certificate;
- 16 KB Android page alignment;
- required `arm64-v8a` and `x86_64` native libraries;
- required Internet permission;
- unnecessary overlay and legacy external-storage permissions absent;
- production Supabase URL and publishable key present in the compiled bundle.

## Exact-APK interaction suite passed

The exact signed APK passed the complete Android 16 interaction suite before upload to Expo, including:

- clean install and fresh launch to Welcome rather than password reset;
- force-stop and signed-out relaunch;
- sign-in validation and navigation;
- account creation validation;
- password-reset empty-form validation;
- successful password-recovery request;
- deterministic Back to sign in behaviour;
- onboarding validation and context save;
- Home, Skills, Train, Progress and Profile loading from the live backend without the shared error state;
- signed-in password-change navigation and validation;
- stale password-reset deep-link rejection while signed in;
- persisted authenticated cold relaunch;
- sign-out back to Welcome;
- disposable account deletion;
- no fatal Java/Kotlin, React Native or native-signal crash.

## Expo-hosted copy verification passed

The APK downloaded back from Expo had the same SHA-256 digest and was byte-identical to the exact tested APK. That Expo-hosted copy then passed the same complete Android 16 launch, authentication, onboarding, account and tab interaction suite.

The release workflow's application and runtime gates passed. Its final disposable-account cleanup shell block had a workflow syntax error after testing completed; the remaining test account was removed directly from Supabase and no product or release validation was affected.
