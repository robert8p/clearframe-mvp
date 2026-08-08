# Cogni scoring — v0.7.0

Cogni exposes a 0–100 **Development Score** for each skill and a separate evidence-reliability value. Neither is a population percentile.

## Response observation

Single-choice and triage questions are scored 0 or 1. Multi-select, ranking and classification can produce `score_fraction` between 0 and 1 using deterministic format-specific rules.

The skill update uses the same expected-success logic as before, but consumes the observed score fraction rather than only a Boolean result. This allows a learner who correctly classifies 3 of 4 signals to receive more evidence than a wholly incorrect response without claiming perfect mastery.

## Partial-credit rules

- **Multi-select:** option-level inclusion/exclusion discrimination; the score reflects correct decisions across all options.
- **Ranking:** proportion of positions placed correctly.
- **Classification:** proportion of statements assigned to the correct category.
- **Single-choice / triage:** exact answer only.

`is_correct` remains useful for exact-correctness analytics, while `score_fraction` drives the richer mixed-format learning signal.

## Reliability

Reliability remains a separate function of the number of observations. Sparse evidence is explicitly labelled as early/low confidence rather than being made to look precise.

## XP

Scored challenges award 7–12 XP based on `score_fraction`. The daily lesson awards +5 XP once per local day, idempotently. XP is motivational and is not used as a psychometric measure.

## Scientific boundary

The current scoring is a transparent adaptive heuristic suitable for an MVP. It is not IRT/BKT or a validated latent-trait estimate. Format effects, partial-credit rules and transfer to real decisions should be empirically tested before making stronger assessment claims.
