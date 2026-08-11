# Cogni internal-alpha QA report

Last refreshed: 11 August 2026

## Release position

Cogni is at internal-alpha stage across the production web app and native Android preview app.

- Production web/API: `https://gocogni.vercel.app`
- Supabase project: `dhklfrqhsmofqrawfdjz`
- Expo/EAS project: `24fc0fea-5e66-4365-a82c-ac668aded7d0`
- Final Android internal-preview build: `4ee40b09-7a91-43e7-a3dd-df2eaded166e`
- Final APK SHA-256: `3ebed1aaa91777e2d72cc76ea76659cf98d8b0243176bde1cdcd3eabe7b05f65`
- Mobile dependency / Expo compatibility / TypeScript CI: passing
- Production Vercel deployments after the integrity hardening: READY
- Production error/fatal runtime-log check: clean
- Android package: `app.gocogni.cogni`
- Android version: `0.1.0` / version code `1`
- Android min SDK: 24
- Android target SDK: 36

## Production content integrity

The live database was checked directly after all audience-depth migrations were applied.

Current live content:

- 5 active audience segments
- 780 challenges
- 95 daily lessons
- 126 audience-tagged challenges per active audience
- 16 audience-tagged lessons per active audience
- 7 shared core diagnostic questions plus 5 audience-applied diagnostic questions per audience

The production integrity audit currently returns zero issues for:

- published challenge without answer key
- published challenge without skill mapping
- empty challenge prompt or title
- empty options
- invalid single-choice / triage answer index
- duplicate published prompt
- published challenge without audience coverage
- invalid complexity value
- streak date without a matching completed core training session
- suspicious diagnostic sessions with more than 12 unique answers or fragmented session keys
- profile XP not reconciling to persisted response XP plus one-time lesson XP

The repeatable read-only version is stored in `scripts/internal_alpha_integrity.sql`.

## Audience-depth checks

Audience difficulty and complexity increase progressively from university to executive content. All five audiences have coverage across single choice, multi-select, ranking, classification and triage formats.

The native and web flows share the same audience-aware engine, lesson assignment, persisted training sessions, scoring and skill history.

## Integrity and security defects found and fixed

### Diagnostic session binding

Previous behaviour accepted any published diagnostic challenge when the client supplied `mode=diagnostic` and a UUID session key. A modified client could therefore submit diagnostic questions outside the currently issued starting check and repeatedly influence scores/XP.

Fixed in both web and mobile answer APIs:

- diagnostic challenge must belong to the learner's current issued starting-check definition
- a partially completed starting check must continue under its existing session key
- already-completed diagnostics cannot be resubmitted
- already-answered starting-check challenges cannot be submitted again
- training and practice challenge submissions are bound to a user-owned persisted session and assignment

Shared protection is implemented in `lib/answer-guards.ts`.

### Daily streak semantics

Previous behaviour advanced `current_streak` and `last_session_date` after every scored answer, including diagnostic/practice answers and incomplete daily sessions.

Fixed so that:

- XP remains awarded per scored response
- daily streak changes only when the assigned core training session reaches completed status
- practice and diagnostic responses do not extend the daily streak
- the streak is changed at most once per local day

One historical stale streak created by the previous behaviour was identified in production and corrected. Post-correction integrity checks return zero streak inconsistencies.

### Atomic XP and streak updates

The previous server implementation used read-then-write profile updates. Concurrent requests could theoretically overwrite one another's XP increments.

Production now uses `public.award_xp_and_maybe_streak(...)`:

- one atomic database update for XP plus optional streak transition
- `SECURITY INVOKER`
- fixed empty `search_path`
- negative XP rejected
- execution revoked from `PUBLIC`, `anon` and `authenticated`
- execution granted only to `service_role`

The function was smoke-tested under `service_role` inside a rollback transaction without changing production values.

### Atomic daily lesson completion

Lesson completion previously inserted the completion row and updated XP as two separate database actions. A failure between them could persist completion without the +5 XP award.

Production now uses `public.complete_daily_lesson_with_xp(...)`:

- completion row and XP increment execute in one database transaction
- duplicate completion for the same user/day returns 0 XP
- client roles cannot execute the RPC directly; `service_role` only
- test transaction proved first completion = +5 XP, duplicate = +0 XP, one total XP increment
- test transaction was rolled back and verified not to persist any synthetic completion or XP

### Answer payload hardening

Both web and mobile answer APIs now reject malformed client payloads before scoring:

- single-choice / triage indexes must be within option bounds
- multi-select indexes are de-duplicated and must be valid
- ranking responses must be a valid permutation containing every option exactly once
- classification responses must classify every expected statement

### Native authentication routing

Native authenticated routes are now protected at the router layer rather than relying on downstream API failures:

- signed-out users are constrained to public auth/entry screens
- signed-in users are routed to onboarding/app screens
- splash remains visible until initial auth state is resolved
- native signup explicitly redirects email confirmation to the live Cogni login URL

The consolidated native CI passed after these changes.

### Android permission minimisation

Binary inspection of an earlier Android APK surfaced `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`, none of which are required by Cogni's current feature set.

The Android config now blocks all three. Final binary inspection of build `4ee40b09-7a91-43e7-a3dd-df2eaded166e` proved they are absent from the built manifest.

The final manifest requests only:

- `app.gocogni.cogni.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
- `android.permission.INTERNET`
- `android.permission.VIBRATE`

## Final Android APK binary verification

GitHub Actions downloaded and inspected the actual final EAS APK. Verification passed for:

- valid APK/ZIP archive
- SHA-256 `3ebed1aaa91777e2d72cc76ea76659cf98d8b0243176bde1cdcd3eabe7b05f65`
- valid Android v2 signature
- one RSA 2048-bit signer
- package `app.gocogni.cogni`
- version name `0.1.0`
- version code `1`
- min SDK 24
- target SDK 36
- production Cogni API endpoint embedded
- production Cogni Supabase endpoint embedded
- unnecessary overlay/storage permissions absent

This artifact supersedes the earlier internal-preview APK for alpha testing.

## CI/release workflow position

The repository retains only two intended mobile workflows:

- `Expo mobile CI`
- `EAS Android preview`

Both maintained workflows use current Node-24 GitHub Action runtimes. Android preview builds remain manual-only so normal commits do not consume EAS build capacity.

## Supabase security-advisor position

Post-DDL security advisors showed no new function/privilege warnings from the new RPCs.

The remaining material Auth hardening item is **leaked-password protection disabled**. This should be enabled in Supabase Auth settings before wider external access.

Several RLS-enabled/no-policy notices remain informational for intentionally server-only tables such as answer keys; they should continue to be reviewed if any such table is later exposed directly to clients.

## Existing learning/content QA retained

- mandatory daily micro-lesson before core daily training
- audience-aware diagnostic and adaptive content
- five interaction formats
- partial-credit scoring for multi-select, ranking and classification
- deterministic server-side grading
- separated answer keys
- persisted daily training sessions
- idempotent lesson completion with +5 XP once per local day
- audience-aware difficulty targeting and contextual selection
- challenge XP of 7–12 based on score fraction

## Known next QA priorities

1. Device-level walkthrough of the final Android APK for each of the five audiences.
2. Test interruption/resume behaviour during diagnostic, lesson and daily training on a physical device.
3. Validate accessibility, keyboard handling and small-screen layout on representative Android devices.
4. Enable Supabase Auth leaked-password protection before wider external access.
5. Add automated behavioural tests around answer/session integrity.
6. Instrument internal-alpha retention and completion funnels before recruiting a wider pilot group.

## Scientific boundary

Cogni's current 0–100 Development Score is an adaptive heuristic with separate evidence reliability. It is not a population percentile, IRT/BKT estimate or validated latent-trait measure. Transfer, calibration, interaction-format effects and adaptive sequencing efficacy still require empirical validation before stronger assessment claims are made.
