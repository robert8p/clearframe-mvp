# Cogni internal-alpha QA report

Last refreshed: 21 August 2026

## Release position

Cogni is an **internal-alpha Expo / React Native product**. The active client lives in `mobile/` and ships through Expo / EAS. The former Next.js / Vercel client is legacy compatibility source only and must not be treated as the active product architecture.

Current position:

- Supabase project: `dhklfrqhsmofqrawfdjz`
- Expo / EAS project: `24fc0fea-5e66-4365-a82c-ac668aded7d0`
- Mobile source version: **0.3.2**
- Android package: `app.gocogni.cogni`
- Active API: authenticated Supabase Edge Function `mobile-api`
- Persistence: Supabase Postgres
- Authentication: Supabase Auth with native secure session storage and non-crashing fallback behaviour
- Sensitive grading and score writes: server-side only
- Mobile CI: passing

The current installable Android candidate is the **fully rebuilt and runtime-tested Cogni 0.3.2 / version-code 8 APK** documented in `ANDROID_0.3.2_VERIFICATION.md`.

## Confirmed Android startup failure and correction

### What failed

The 0.3.0 and 0.3.1 Android previews installed but repeatedly exited on launch on the physical Samsung test device. The earlier 0.3.1 review proved only that the APK was structurally valid and correctly signed. That was insufficient because it did not execute the application.

The exact 0.3.1 APK was subsequently installed into an Android 16 environment and produced the following fatal startup path:

- `Cogni is missing EXPO_PUBLIC_SUPABASE_URL`
- `FATAL EXCEPTION: mqt_v_native`
- React Native `JavascriptException` during module startup

Direct inspection of that APK's compiled JavaScript bundle confirmed that the production Supabase URL and publishable key were absent. The source used a computed `process.env[name]` lookup. Expo public client settings must be statically referenced for Metro to replace them during bundling, so the production binary reached startup without its required connection configuration.

This is the confirmed primary cause of the repeatable immediate crash in the distributed 0.3.1 APK.

### What changed in 0.3.2

- Expo public Supabase settings are referenced statically and checked in the compiled Android bundle.
- A malformed future build renders a visible configuration-error screen instead of throwing during module initialization.
- The retired SQLite/localStorage adapter was removed from the startup path.
- SecureStore remains the persistence layer, with a safe in-memory fallback when native secure storage is unavailable or corrupt.
- Android app-data backup remains disabled for sensitive local state.
- The logic/security audit now rejects dynamic Expo environment lookup and retired SQLite startup coupling.
- The app version was advanced to **0.3.2**.

The full source-quality suite passed: dependency compatibility, ESLint, UI/accessibility audit, logic/security audit, TypeScript, production Android bundle configuration smoke test, Supabase Edge typecheck and contextual-engine behavioural tests.

## Fully rebuilt and tested 0.3.2 APK

The cloud EAS account had exhausted its monthly Android build allowance, so the application was rebuilt using Expo's local EAS build path with the existing remotely managed Cogni signing credentials. This still generated a complete signed release-style APK from a clean native Android workspace rather than reusing the earlier binary.

Exact tested APK:

- Version name: **0.3.2**
- Version code: **8**
- Package: `app.gocogni.cogni`
- Minimum SDK: **24**
- Target SDK: **36**
- APK SHA-256: `b2bdbdd70ba4440b09dab585cf2598855c9936dd10f8bf0cbb44834194e14adf`
- Signing certificate SHA-256: `e0bfda379dfa0e11aee798e443ce3b33d006d83b7857062f8f639ca7f7572c7e`
- Exact tested source tree: `a87c35003293e424ba3549fdc9d14a2a8b36555e`
- Verification run: `32430604484`

Binary validation passed for archive integrity, app identity, v2 signing, established signing certificate, 16 KB page alignment, `arm64-v8a` and `x86_64` native libraries, embedded production Supabase configuration and permission minimisation.

The exact APK was then clean-installed and exercised on both:

- **Android 15 / API 35**
- **Android 16 / API 36**

On each environment it:

- installed successfully;
- completed a cold launch;
- rendered the expected signed-out Cogni welcome experience;
- remained alive, foreground and top-resumed after 60 seconds;
- survived a second forced cold launch;
- remained alive for a further 30 seconds;
- produced no fatal Java/Kotlin, React Native or native-signal crash.

This is materially stronger evidence than the prior archive/signature-only validation.

## Active architecture

- **Client:** Expo / React Native + Expo Router
- **Build / distribution:** Expo / EAS
- **Authentication:** Supabase Auth
- **Mobile API:** authenticated `mobile-api` Supabase Edge Function
- **Database:** Supabase Postgres
- **Answer keys:** server-side; not shipped to the mobile client
- **Privileged writes:** server-side only
- **Session credentials:** native secure storage with crash-safe fallback behaviour
- **Quality gates:** Expo dependency check, ESLint, UI audit, logic/security audit, TypeScript, compiled-bundle configuration smoke, Edge Function typecheck and behavioural tests

Vercel is not a dependency of the current mobile runtime.

## Production content snapshot

The live database was checked directly during the August 2026 internal-alpha review.

Published content:

- **6 learner contexts:** casual / personal growth, university student, graduate / early career, junior professional, management and executive
- **863 published challenges**
- **42 published diagnostic challenges**
- **111 published daily lessons**
- Each learner context currently resolves to **233 published challenges** and **31 published lessons** when shared `all` content is included

The production content-integrity audit returned **zero issues** for published answer-key coverage, skill mapping, empty prompts/titles/options, invalid single-choice/triage answer indexes, duplicate published prompts, audience coverage and complexity validity.

Additional live integrity checks returned:

- **0 streak inconsistencies**
- **0 suspicious diagnostic-session structures**
- **0 XP reconciliation issues**

The repeatable read-only integrity pack is `scripts/internal_alpha_integrity.sql`.

## Learning and personalisation position

Cogni currently supports context-aware daily lessons and practice; time-aware scenario selection; safe transfer scenarios; six learner contexts; persisted daily sessions; five interaction formats; partial-credit scoring; confidence capture; 0–100 Development Scores with separate evidence reliability; reduced repeat-question evidence weight; focused skill practice; per-situation relevance feedback; XP and streak motivation.

Audience context changes scenario relevance, stakes and decision complexity; it is not treated as an estimate of innate ability.

## Stakeholder-readiness position

The current product explains that the starting check is not pass/fail, gives bounded effort expectations, makes adaptive selection more interpretable, teaches users to read score together with evidence strength, converts progress into a next-best-practice action, and exposes privacy/scientific boundaries in learner-facing language.

## Measurement position

Authoritative internal-alpha activation and retention measurement is defined in `METRICS.md` and `scripts/internal_alpha_metrics.sql` using server-side learning facts rather than client page-view telemetry.

Core definitions:

- **Activation:** first completed core daily training session
- **D1 / D3 / D7 retention:** server-observed learning activity exactly 1 / 3 / 7 days after activation
- **Session effort:** first-to-last scored-answer span for completed sessions

Current live user counts remain too small to treat activation or retention percentages as product evidence. Cohorts below 20 are explicitly directional only.

## Supabase security position

The Supabase Security Advisor shows only informational RLS-enabled/no-policy notices for tables intentionally inaccessible to normal client roles, including answer-key and other server-oriented tables.

The earlier QA report recorded **leaked-password protection as disabled**. Connected tooling can query the database and security advisor but cannot read or patch the hosted Auth-service configuration, so this remains an unresolved wider-release gate until explicitly verified as enabled.

## Current release gates

Before wider external access:

1. **Clean-install and launch the tested 0.3.2 APK on the Samsung device.** Automated Android 15/16 runtime tests passed, but the user's exact Samsung firmware and hardware remain the decisive real-device confirmation.
2. **Run a physical-device walkthrough across all six learner contexts.** Cover onboarding, starting check, lesson, daily training, answer feedback, Skills, Progress and Profile.
3. **Exercise interruption/resume paths** during the starting check, lesson and daily session.
4. **Validate representative Samsung screen/keyboard/accessibility behaviour**, including reduced motion.
5. **Verify and enable Supabase Auth leaked-password protection** before broad external recruitment.
6. **Recruit a wider pilot only after those gates**, then interpret activation/retention with the sample-size guardrails in `METRICS.md`.

## Scientific boundary

Cogni's current 0–100 Development Score is an adaptive learning indicator with separate evidence reliability. It is **not** a population percentile, validated latent-trait estimate, employment assessment or permanent grade.

Transfer, calibration, interaction-format effects and adaptive-sequencing efficacy still require empirical validation. Product language should continue to distinguish observed in-app performance from proven real-world capability improvement.
