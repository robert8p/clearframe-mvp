# Cogni 0.4.4 — live content and access review

7 September 2026. Read-only inspection of Cogni Supabase project `dhklfrqhsmofqrawfdjz`. No database migration, billing activation or existing-user modification was performed by this review.

## Published learning content

| Check | Observed result |
|---|---:|
| Published questions | 863 |
| Published lessons | 111 |
| Single-choice questions | 405 |
| Multi-select questions | 115 |
| Ranking questions | 122 |
| Classification questions | 110 |
| Triage questions | 111 |
| Published questions without an answer key | 0 |
| Published questions missing an explanation or thinking principle | 0 |
| Duplicate normalised prompt groups | 0 |

The audience-tag counts were 126 questions for each of the six contexts—everyday/casual, university student, graduate/early career, junior professional, management and executive—plus 107 tagged for all contexts. These are content records, not counts of active learners or proof that every lesson is equally relevant.

Duplicate checking lowercased prompts, trimmed their ends and normalised internal whitespace. It detects exact textual duplication only. It does not establish semantic originality, difficulty calibration, factual correctness of every item or how repetitive a person will find the experience. No broad content rewrite was performed on the strength of a structural check alone.

The existing engine prioritises unseen prompt/question identifiers, considers recent scenarios and adverse relevance feedback, and offers five interaction formats. Version 0.4.4 retains that engine. Its twelve new date-rotating reflection lenses and three sample decisions are clearly separate from the server's adaptive assessment. The lenses are not represented as unlimited new content or a validated spaced-repetition schedule.

## Live preview configuration

`public.monetization_config` reported `monetization_enabled = false`. Its stored configuration was one free core session per day, focused practice marked as a Pro feature, and a seven-day free history window when monetisation is enabled. The global disabled-sales preview remains active; it was not changed by this release.

## Access boundaries

Row-level security was enabled for the inspected `profiles`, `training_sessions`, `user_skill_scores`, `analytics_events`, `subscription_entitlements`, `monetization_config` and `support_requests` tables.

Policies for training sessions and skill scores expose the signed-in user's own records for reading, not client-authored scores. Entitlement writes and support/configuration storage remain server-controlled. Profiles have an owner policy, but the authenticated client does not have table-level UPDATE permission. Analytics has owner-scoped INSERT/SELECT policies. Some legacy table-level read grants exist; those grants are not equivalent to unrestricted row access because RLS and the applicable policies still apply.

This is a targeted access/configuration inspection, not an exhaustive penetration test or legal certification. The separate mobile/backend regression suites check the relevant authentication, scoring and entitlement contracts. Native testing must additionally verify the actual distributed binary and account-switch behaviour.

## New device-local data

The thinking toolkit uses encrypted, account-scoped device storage; it introduces no server table or analytics upload. Saved content is bounded to twelve ideas, local practice-day history to twenty-eight dates, and the weekly target is optional. Only an accepted live answer records a day. Save/clear operations do not grant points or subscription access. No prior learning history is fabricated or backfilled into this new device aid.

The interface explicitly states its local-only scope, replacement limit, offline use and clear/remove options. Share actions include the displayed idea, not the learner's account, score or history. Independent physical-device and user testing are still needed to assess actual usefulness and accessibility.

## Design contrast spot-check

The added opaque surface backgrounds, five relevant text colours and primary-button gradient endpoints were checked mathematically: 43 foreground/background combinations, minimum contrast ratio 5.86:1. This excludes disabled controls, alpha compositing and other existing screens. It is not a claim of complete accessibility compliance. Native large-text rendering and human screenshot review are separate release checks.
