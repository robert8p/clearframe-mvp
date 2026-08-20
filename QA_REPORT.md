# Cogni internal-alpha QA report

Last refreshed: 20 August 2026

## Release position

Cogni is an **internal-alpha Expo / React Native product**. The active client lives in `mobile/` and ships through Expo / EAS. The former Next.js / Vercel client is legacy compatibility source only and must not be treated as the active product architecture.

Current position:

- Supabase project: `dhklfrqhsmofqrawfdjz`
- Expo / EAS project: `24fc0fea-5e66-4365-a82c-ac668aded7d0`
- Mobile source version: **0.3.1**
- Android package: `app.gocogni.cogni`
- Active API: authenticated Supabase Edge Function `mobile-api`
- Persistence: Supabase Postgres
- Authentication: Supabase Auth with crash-safe native secure session storage and compatibility recovery
- Sensitive grading and score writes: server-side only
- Mobile CI: passing

## Android 0.3.1 startup hotfix

A 0.3.0 Android preview built from source commit `54f1806c8683496e047e620bef3b8fad28457d01` installed successfully but repeatedly exited/crashed on launch on the physical Samsung test device.

The strongest identified startup regression was the migration from the previously validated SQLite/localStorage Supabase auth adapter to `expo-secure-store`. The pre-hotfix adapter allowed native SecureStore read/decrypt/write failures to escape during authentication initialization. Android backup handling was also not explicit. This is the leading causal explanation, not yet a definitive device-level root cause; physical confirmation of the hotfix remains required.

Hotfix changes in 0.3.1:

- Android app-data backup disabled for sensitive local state
- explicit `expo-secure-store` Android backup configuration
- SecureStore availability/read/write/delete failures made recoverable rather than startup-fatal
- corrupt or implausible secure-storage chunk metadata guarded
- local compatibility copy retained until secure persistence succeeds
- root startup error boundary added so future JavaScript startup failures show a recovery screen rather than silently closing
- automated logic/security checks added to prevent those protections regressing

The complete Expo mobile quality suite passed before the hotfix merged: dependency compatibility, ESLint, UI/accessibility audit, logic/security audit, TypeScript, Supabase Edge typecheck and context-engine behavioural tests.

### Verified installable 0.3.1 APK

A fresh EAS Android preview was built from the hotfix source and finished successfully.

- EAS build ID: `2f87a498-a79e-4b97-ba5c-b2ecc51d8219`
- Version name: **0.3.1**
- Version code: **7**
- Package: `app.gocogni.cogni`
- SHA-256: `462b8a5cf3f270263aa577c3fc546cd51be7ac5a012fc24d9d447b4e2d5eb7cf`
- APK archive integrity: passed
- APK Signature Scheme v2 verification: passed
- Signing certificate SHA-256: `e0bfda379dfa0e11aee798e443ce3b33d006d83b7857062f8f639ca7f7572c7e`
- Signing certificate matches the previously validated Cogni APK: passed
- Internet permission present: passed
- `SYSTEM_ALERT_WINDOW` absent: passed
- legacy read/write external-storage permissions absent: passed

The binary is therefore structurally valid and correctly signed. The remaining decisive check is to launch **this exact 0.3.1 build on the physical device**.

The `EAS Android preview` workflow is restored to manual-only after this verification so ordinary commits do not consume EAS build capacity.

## Active architecture

- **Client:** Expo / React Native + Expo Router
- **Build / distribution:** Expo / EAS
- **Authentication:** Supabase Auth
- **Mobile API:** authenticated `mobile-api` Supabase Edge Function
- **Database:** Supabase Postgres
- **Answer keys:** server-side; not shipped to the mobile client
- **Privileged writes:** server-side only
- **Session credentials:** secure native storage with crash-safe recovery
- **Quality gates:** Expo dependency check, ESLint, UI audit, logic/security audit, TypeScript, Edge Function typecheck and behavioural tests

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

1. **Install and launch the verified 0.3.1 APK on the Samsung device.** For the cleanest diagnostic, remove the crashing 0.3.0 build first, then install 0.3.1 fresh.
2. **Run a physical-device walkthrough across all six learner contexts.** Cover onboarding, starting check, lesson, daily training, answer feedback, Skills, Progress and Profile.
3. **Exercise interruption/resume paths** during the starting check, lesson and daily session.
4. **Validate representative Android screen sizes, keyboard handling, accessibility semantics and reduced-motion behaviour.**
5. **Verify and enable Supabase Auth leaked-password protection** before broad external recruitment.
6. **Recruit a wider pilot only after those gates**, then interpret activation/retention with the sample-size guardrails in `METRICS.md`.

## Scientific boundary

Cogni's current 0–100 Development Score is an adaptive learning indicator with separate evidence reliability. It is **not** a population percentile, validated latent-trait estimate, employment assessment or permanent grade.

Transfer, calibration, interaction-format effects and adaptive-sequencing efficacy still require empirical validation. Product language should continue to distinguish observed in-app performance from proven real-world capability improvement.
