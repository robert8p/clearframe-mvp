# Cogni internal-alpha metrics

Cogni's product metrics deliberately prefer **authoritative server-side learning facts** over client page views. The goal is to measure whether people get value and return to practise, not merely whether a screen rendered.

The repeatable read-only query pack is `scripts/internal_alpha_metrics.sql`.

## North-star sequence

The alpha funnel is:

**Sign-up → learning context set → starting check started → starting check completed → daily lesson completed → core training started → activation**

**Activation** means the learner has completed their first core daily training session. This is a stronger threshold than account creation or opening the app because it demonstrates that the learner reached the complete Cogni loop.

## Retention

Retention is measured from the learner's activation date.

- **D1:** a server-observed learning activity exactly one day after activation.
- **D3:** a server-observed learning activity exactly three days after activation.
- **D7:** a server-observed learning activity exactly seven days after activation.

A learning activity is any of:

- a scored response;
- a completed daily lesson; or
- a created core training session.

The eligible denominator includes only learners old enough to have reached the relevant retention day.

## Session completion

Core-session completion is read directly from `training_sessions.status`.

Do not use `completed_at - started_at` as the main effort metric because Cogni supports interruption and resume. A session left open for an hour and completed later is not an hour of active learning.

The primary effort estimate is therefore the time between the first and last scored answer in a completed session. Wall-clock age is retained only to identify interrupted/resumed sessions.

## Evidence guardrails

Always display the cohort count beside a percentage.

- **Eligible cohort < 20:** directional observation only; do not describe the percentage as product performance.
- **20–49:** early pilot signal; use cautiously and inspect individual journey failures.
- **50+:** useful operating signal, but still not causal evidence that Cogni itself caused retention or learning improvement.

No retention, activation or completion percentage is a claim of learning efficacy. Efficacy and transfer require separate validation.

## Data integrity

The funnel and retention queries use `auth.users`, `profiles`, `user_responses`, `user_lesson_completions`, `training_sessions` and challenge metadata. These are server-controlled or server-validated product records.

`analytics_events` is supporting telemetry and a reconciliation aid. It is not the authoritative source for activation or retention because historical events include the retired web client and client-oriented event streams are easier to duplicate or spoof.

## Starting-check dependency

The current starting check contains 12 questions. The funnel query treats a diagnostic session with 12 distinct scored answers as complete. If the engine changes that definition, update `scripts/internal_alpha_metrics.sql` in the same product change.
