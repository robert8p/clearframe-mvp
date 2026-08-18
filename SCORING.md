# Cogni scoring — current model

Cogni exposes a 0–100 **Development Score** for each skill and a separate evidence-reliability value. Neither is a population percentile or a validated psychometric latent-trait estimate.

## Response observation

Single-choice and triage questions are scored 0 or 1. Multi-select, ranking and classification can produce `score_fraction` between 0 and 1 using deterministic format-specific rules.

The skill update compares the observed score fraction with expected success at the challenge difficulty. Partial credit therefore changes the score proportionately rather than forcing every response into correct/incorrect only.

## Partial-credit rules

- **Multi-select:** authored required-selection counts are enforced by both client and server; scoring then reflects correct include/exclude decisions across the option set.
- **Ranking:** proportion of positions placed correctly.
- **Classification:** proportion of statements assigned to the correct category.
- **Single-choice / triage:** exact answer only.

`is_correct` remains useful for exact-correctness analytics, while `score_fraction` drives the richer mixed-format learning signal.

## Evidence reliability

Reliability uses `evidence_points`, not raw attempts alone.

- First response to a challenge: **1.0 evidence point**
- Later response to the same challenge: **0.35 evidence point**

Raw `attempts` are still retained as an engagement/history measure. The reduced repeat weight prevents familiar questions from creating the same confidence increase as novel evidence while allowing spaced reinforcement to contribute some evidence.

Reliability is currently:

`1 - exp(-evidence_points / 8)`

rounded for display/storage. Sparse evidence is explicitly labelled as early/building evidence rather than being made to look precise.

## Atomicity

Scored-answer persistence and score movement run inside the service-role-only `record_scored_answer(...)` Postgres function. It acquires a per-user transaction advisory lock, so submissions from two devices cannot silently overwrite one another's score/reliability state.

## XP and streaks

Scored challenges award 7–12 XP based on `score_fraction`. The daily lesson awards +5 XP once per user-local day, idempotently. Daily-session completion moves the streak using that same stored user timezone/local date.

XP is motivational and is not used as an assessment measure.

## Scientific boundary

The current scoring remains a transparent adaptive heuristic appropriate to the product's current stage. It is not IRT, BKT, CAT or a validated population norm. Format effects, repeat weighting, difficulty calibration and transfer to real-world decisions should be empirically validated before stronger assessment claims are made.
