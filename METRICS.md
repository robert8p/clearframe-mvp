# Cogni product metrics

Cogni's product metrics deliberately prefer **authoritative server-side learning and entitlement facts** over client page views. The goal is to measure whether people get value, return to practise and—where relevant—choose to pay, not merely whether a screen rendered.

The repeatable learning query pack is `scripts/internal_alpha_metrics.sql`.
The repeatable subscription and paywall query pack is `scripts/monetization_metrics.sql`.

## North-star learning sequence

**Sign-up → learning context set → starting check started → starting check completed → daily lesson completed → core training started → activation**

**Activation** means the learner has completed their first core daily training session. This is stronger than account creation or app-open because it demonstrates that the learner reached the complete Cogni loop.

## Retention

Retention is measured from activation date.

- **D1:** server-observed learning activity exactly one day after activation.
- **D3:** server-observed learning activity exactly three days after activation.
- **D7:** server-observed learning activity exactly seven days after activation.

A learning activity is any of a scored response, completed daily lesson or created core training session. The eligible denominator includes only learners old enough to have reached the relevant day.

## Session completion

Core-session completion is read directly from `training_sessions.status`.

Do not use `completed_at - started_at` as the main effort metric because Cogni supports interruption/resume. The primary effort estimate is the time between first and last scored answer in a completed session; wall-clock age is retained only to identify interrupted/resumed sessions.

## Monetisation funnel — 0.4.0

The commercial funnel is measured **after learning activation** wherever possible:

**Activated learner → intentional premium feature selection → paywall viewed → purchase started → purchase completed → server entitlement activated**

Key metrics must always show numerator and denominator:

- Activated learner → paywall: `activated learners with paywall_viewed / eligible activated learners`.
- Paywall → purchase start: `distinct users with purchase_started / distinct users with paywall_viewed`.
- Paywall → verified Pro: `distinct users with entitlement_activated / distinct users with paywall_viewed`.
- Purchase start → verified Pro: `distinct users with entitlement_activated / distinct users with purchase_started`.
- Monthly vs annual mix: verified activated entitlements grouped by `product_id`.
- Restore success: `restore_completed outcome=subscription_restored / restore_started`, with denominator.
- Intro/trial conversion: only report when a store-intro cohort can be reliably identified and the corresponding renewal outcome has matured.
- Pro retention/churn: use the server entitlement lifecycle and store-reported expiration/renewal state, not local UI state.
- Free vs Pro engagement: compare learning activity rates using server entitlement state at the relevant time; label this observational, not causal.

Revenue, ARPU and LTV must not be inferred from hardcoded list prices. Use actual store/RevenueCat transaction/revenue data once connected and reconcile refunds/revocations.

## Monetisation event authority

Client-originated allow-listed telemetry in `analytics_events`:

- `paywall_viewed`
- `paywall_dismissed`
- `premium_feature_selected`
- `purchase_started`
- `purchase_completed`
- `purchase_failed`
- `restore_started`
- `restore_completed`

Server-originated entitlement lifecycle events:

- `entitlement_activated`
- `entitlement_expired`
- `entitlement_revoked`

A client `purchase_completed` event is **not** proof of premium access. `subscription_entitlements` plus the server lifecycle event is the authority for verified Pro access.

Do not include payment-card details, store receipt bodies or other sensitive payment data in product analytics.

## Pricing / paywall decision metrics

A price increase should be considered only when verified-Pro conversion remains healthy, annual mix/retention are stable and there is evidence of willingness to pay—not merely because gross revenue increased on a small cohort.

A price decrease or stronger annual value test is justified when there is meaningful paywall intent but persistently weak verified-Pro conversion, after ruling out billing/setup friction.

A paywall is damaging the product if activated learners exposed to it show a material, persistent decline in subsequent free-core D1/D3/D7 learning activity versus comparable unexposed learners, particularly when paywall dismissal is followed by abandonment. Treat this as observational until an adequately powered experiment exists.

## Evidence guardrails

Always display cohort count beside a percentage.

- **Eligible cohort < 20:** directional observation only; do not describe the percentage as product performance.
- **20–49:** early pilot signal; use cautiously and inspect individual journey failures.
- **50+:** useful operating signal, but still not causal evidence that Cogni caused retention, learning improvement or purchase behavior.

No retention, activation, completion or conversion percentage is a claim of learning efficacy. Efficacy and transfer require separate validation.

## Data integrity

Learning funnels use server-controlled/validated records in `auth.users`, `profiles`, `user_responses`, `user_lesson_completions`, `training_sessions` and challenge metadata.

`analytics_events` is supporting telemetry and a reconciliation aid. It is not the authority for learning activation/retention. For monetisation, authoritative access state is `subscription_entitlements`; webhook idempotency/audit state is `subscription_webhook_events`.

## Starting-check dependency

The current starting check contains 12 questions. The funnel query treats a diagnostic session with 12 distinct scored answers as complete. If the engine changes that definition, update `scripts/internal_alpha_metrics.sql` in the same product change.
