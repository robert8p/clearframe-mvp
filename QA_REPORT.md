# Cogni internal-alpha QA report

Last refreshed: 11 August 2026

## Release position

Cogni is at internal-alpha stage across the production web app and native Android preview app.

- Production web/API: `https://gocogni.vercel.app`
- Supabase project: `dhklfrqhsmofqrawfdjz`
- Expo/EAS project: `24fc0fea-5e66-4365-a82c-ac668aded7d0`
- Installable Android internal-preview build: completed successfully
- Mobile dependency / Expo compatibility / TypeScript CI: passing
- Latest production Vercel deployment after the integrity hardening: READY

## Production content integrity

The live database was checked directly after all audience-depth migrations were applied.

Current live content:

- 5 active audience segments
- 780 challenges
- 95 daily lessons
- 126 audience-tagged challenges per active audience
- 16 audience-tagged lessons per active audience
- 7 shared core diagnostic questions plus 5 audience-applied diagnostic questions per audience

The following production checks currently return zero issues:

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

The repeatable read-only version of these checks is stored in `scripts/internal_alpha_integrity.sql`.

## Audience-depth checks

Audience difficulty and complexity increase progressively from university to executive content. All five audiences have coverage across single choice, multi-select, ranking, classification and triage formats.

The native and web flows share the same audience-aware engine, lesson assignment, persisted training sessions, scoring and skill history.

## Integrity defects found and fixed during internal-alpha QA

### Diagnostic session binding

Previous behaviour accepted any published diagnostic challenge when the client supplied `mode=diagnostic` and a UUID session key. A modified client could therefore submit diagnostic questions outside the currently issued starting check and repeatedly influence scores/XP.

Fixed in both web and mobile answer APIs:

- diagnostic challenge must belong to the learner's current issued starting-check definition
- a partially completed starting check must continue under its existing session key
- already-completed diagnostics cannot be resubmitted
- already-answered starting-check challenges cannot be submitted again

Shared protection is implemented in `lib/answer-guards.ts`.

### Daily streak semantics

Previous behaviour advanced `current_streak` and `last_session_date` after every scored answer, including diagnostic/practice answers and incomplete daily sessions.

Fixed so that:

- XP remains awarded per scored response
- daily streak changes only when the assigned core training session reaches completed status
- practice and diagnostic responses do not extend the daily streak
- the streak is changed at most once per local day

One historical stale streak created by the previous behaviour was identified in production and corrected. A post-correction integrity audit returns zero streak inconsistencies.

### Answer payload hardening

Both web and mobile answer APIs now reject malformed client payloads before scoring:

- single-choice / triage indexes must be within option bounds
- multi-select indexes are de-duplicated and must be valid
- ranking responses must be a valid permutation containing every option exactly once
- classification responses must classify every expected statement

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
- existing challenge XP of 7–12 based on score fraction

## Known next QA priorities

1. Device-level walkthrough of the finished Android APK for each of the five audiences.
2. Test interruption/resume behaviour during diagnostic, lesson and daily training on a physical device.
3. Validate accessibility, keyboard handling and small-screen layout on representative Android devices.
4. Review Supabase Auth leaked-password protection before wider external access.
5. Add automated behavioural tests around answer/session integrity rather than relying only on build/type checks.
6. Instrument internal-alpha retention and completion funnels before recruiting a wider pilot group.

## Scientific boundary

Cogni's current 0–100 Development Score is an adaptive heuristic with separate evidence reliability. It is not a population percentile, IRT/BKT estimate or validated latent-trait measure. Transfer, calibration, interaction-format effects and adaptive sequencing efficacy still require empirical validation before stronger assessment claims are made.
