# Cogni internal-alpha QA report

Last refreshed: 18 August 2026

## Release position

Cogni is an **internal-alpha Expo / React Native product**. The active client lives in `mobile/` and ships through Expo / EAS. The former Next.js / Vercel client is legacy compatibility source only and must not be treated as the active product architecture.

Current source position:

- Application source baseline before this QA-only refresh: `59845d18861b03a15dc391d30c4a65eba2cd278e`
- Supabase project: `dhklfrqhsmofqrawfdjz`
- Expo / EAS project: `24fc0fea-5e66-4365-a82c-ac668aded7d0`
- Mobile source version: `0.3.0`
- Android package: `app.gocogni.cogni`
- Active API: authenticated Supabase Edge Function `mobile-api`
- Persistence: Supabase Postgres
- Authentication: Supabase Auth with native secure session storage
- Sensitive grading and score writes: server-side only
- Mobile CI: passing on the latest stakeholder-readiness and alpha-metrics changes

The most recently validated installable Android preview is the **0.3.0 / version-code 2** APK validated on 14 August 2026. Its archive, package identity, v2 signature and permission minimisation passed automated binary inspection. **It is not the current release candidate**, because main has materially changed since that APK was built. A new EAS Android preview from current `main` is required before device-level sign-off.

The `EAS Android preview` workflow remains deliberately manual-only so ordinary commits do not consume EAS build capacity. It re-runs dependency, UI, logic/security, TypeScript, Edge Function and context-engine checks before starting an internal APK build.

## Active architecture

- **Client:** Expo / React Native + Expo Router
- **Build / distribution:** Expo / EAS
- **Authentication:** Supabase Auth
- **Mobile API:** authenticated `mobile-api` Supabase Edge Function
- **Database:** Supabase Postgres
- **Answer keys:** server-side; not shipped to the mobile client
- **Privileged writes:** server-side only
- **Session credentials:** native secure storage
- **Quality gates:** Expo dependency check, ESLint, UI audit, logic/security audit, TypeScript, Edge Function typecheck and behavioural tests

Vercel is not a dependency of the current mobile runtime.

## Production content snapshot

The live database was checked directly on 18 August 2026.

Published content:

- **6 learner contexts:** casual / personal growth, university student, graduate / early career, junior professional, management and executive
- **863 published challenges**
- **42 published diagnostic challenges**
- **111 published daily lessons**
- Each learner context currently resolves to **233 published challenges** and **31 published lessons** when shared `all` content is included

The production content-integrity audit currently returns **zero issues** for:

- published challenge without answer key
- published challenge without skill mapping
- empty challenge prompt or title
- empty options
- invalid single-choice / triage answer index
- duplicate published prompt
- published challenge without audience coverage
- invalid complexity value

Additional live integrity checks currently return:

- **0 streak inconsistencies**
- **0 suspicious diagnostic-session structures**
- **0 XP reconciliation issues**

The repeatable read-only integrity pack is `scripts/internal_alpha_integrity.sql`.

## Learning and personalisation position

Cogni currently supports:

- context-aware daily lessons and practice
- time-aware scenario selection using the learner's local context
- safe everyday transfer scenarios outside work / study periods
- explicit protection against promoting casual learners into management / executive-only content
- persisted daily sessions and interruption / resume support
- five interaction formats: single choice, multi-select, ranking, classification and triage
- partial-credit scoring where appropriate
- confidence capture
- 0–100 Development Scores with separate evidence reliability
- reduced independent evidence weight for repeated questions
- focused skill practice
- per-situation relevance feedback
- XP and streak motivation

Audience context changes scenario relevance, stakes and decision complexity; it is not treated as an estimate of innate ability.

## Stakeholder-readiness improvements merged 18 August 2026

The current mobile source now makes several previously implicit product qualities explicit to users:

- onboarding explains that the starting check is not pass / fail, gives an expected effort range and explains that early evidence is provisional
- Train explains expected effort and why a situation was selected
- Progress teaches users to interpret Development Score together with evidence strength rather than as a fixed grade or percentile
- Progress turns measurement into a next-best-practice action
- Profile explains the privacy, server-side grading and scientific boundaries in learner-facing language
- product documentation now reflects the active Expo + Supabase architecture and privacy / psychometric guardrails

These changes passed the full Expo mobile CI before merge.

## Measurement position

Authoritative internal-alpha activation and retention measurement is now defined in:

- `METRICS.md`
- `scripts/internal_alpha_metrics.sql`

The measurement model deliberately uses server-side learning facts rather than relying on client page-view telemetry.

Core definitions:

- **Activation:** first completed core daily training session
- **D1 / D3 / D7 retention:** server-observed learning activity exactly 1 / 3 / 7 days after activation
- **Session effort:** first-to-last scored-answer span for completed sessions, rather than misleading wall-clock session age when a learner interrupts and resumes

Current live user counts are still too small to treat activation or retention percentages as product evidence. The metrics pack explicitly requires the eligible cohort count beside every rate and treats cohorts below 20 as directional only.

## Integrity and security hardening retained

### Session and answer binding

Diagnostic, daily-training and focused-practice answers are bound to the learner's issued or owned session. Already-completed or already-answered diagnostic items cannot simply be resubmitted to influence scores or XP.

### Atomic scoring and evidence

Scored answers use a transactional database path with per-user serialization so concurrent devices cannot silently overwrite skill / XP updates. Repeated questions contribute reduced independent evidence.

### Daily streak semantics

XP may be earned per scored response, but the daily streak advances only when the assigned core daily training session is complete and at most once per learner-local day. Practice and diagnostic responses do not extend the streak.

### Atomic lesson completion

Daily lesson completion and its one-time XP award occur transactionally; duplicate completion does not duplicate the XP award.

### Native auth boundary

Authenticated routes are protected at the router layer. Signed-out users are kept to entry / auth flows; signed-in users are routed to onboarding or product screens. Password recovery routes are native and account deletion is server-side.

### Android permission minimisation

The Android config explicitly blocks unnecessary overlay and legacy external-storage permissions. The previously validated 0.3.0 APK confirmed the resulting package retained only required permissions, including Internet and vibration access.

## Supabase security position

The current Supabase Security Advisor shows only informational `RLS enabled / no policy` notices for tables intentionally kept inaccessible to normal client roles, including answer-key and other server-oriented tables. These should continue to be reviewed if their access model changes.

The 11 August QA report recorded **leaked-password protection as disabled**. Current connected tooling can query the database and security advisor but cannot read or patch the hosted Auth-service configuration, so this control has **not been re-verified or changed in this refresh**. Treat it as an unresolved release gate until the Supabase Auth configuration is explicitly verified as enabled.

Supabase's current password-security guidance supports leaked-password protection on Pro plans and above.

## Current release gates

Before wider external access:

1. **Build a fresh Android preview from current `main`.** The 14 August APK predates the latest contextual-engine, stakeholder-readiness and measurement changes.
2. **Run a physical-device walkthrough across all six learner contexts.** Cover onboarding, starting check, lesson, daily training, answer feedback, Skills, Progress and Profile.
3. **Exercise interruption / resume paths** during the starting check, lesson and daily session.
4. **Validate representative Android screen sizes, keyboard handling, accessibility semantics and reduced-motion behaviour** on the fresh APK.
5. **Verify and enable Supabase Auth leaked-password protection** before broad external recruitment.
6. **Recruit a wider pilot only after the above gates**, then interpret activation / retention with the sample-size guardrails in `METRICS.md`.

## Scientific boundary

Cogni's current 0–100 Development Score is an adaptive learning indicator with separate evidence reliability. It is **not** a population percentile, validated latent-trait estimate, employment assessment or permanent grade.

Transfer, calibration, interaction-format effects and adaptive-sequencing efficacy still require empirical validation. Product language should continue to distinguish observed in-app performance from proven real-world capability improvement.
