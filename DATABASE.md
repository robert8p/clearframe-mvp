# Cogni database — current architecture

Supabase Postgres is the system of record for Cogni authentication-linked profiles, learning content, adaptive sessions, scored responses, skill evidence and analytics.

## Core relations

- `auth.users -> profiles`
- `challenges -> challenge_answer_keys`
- `challenges <-> skills` through `challenge_skill_mapping`
- users -> `user_responses`
- users <-> skills through `user_skill_scores`
- users -> `user_error_patterns`, `analytics_events`, `user_lesson_completions`
- `training_sessions -> training_session_challenges` and optionally one `daily_lesson`
- `practice_sessions -> practice_session_challenges`

`challenge_answer_keys` has RLS enabled and intentionally has no authenticated-user read policy. Grading is performed by trusted server code.

## Current live content volume

Verified against the live Cogni Supabase project on 18 August 2026:

- **906 challenges**
- **111 published daily lessons**
- **15 skills**
- **6 audience segments**

Content is substantially larger than the original v0.7 seed described by older documentation.

## Interaction model

`challenges.interaction_type` supports:

- `single_choice`
- `multi_select`
- `ranking`
- `classification`
- `triage`

`interaction_config jsonb` stores format-specific metadata such as classification categories and required multi-select counts. `challenge_answer_keys.correct_answer jsonb` stores generalized deterministic answers.

`user_responses.response_payload` stores the learner response and `score_fraction` stores alignment from 0 to 1.

## Contextual learning

Profile context uses canonical machine values that match content tags:

- `audience_segment`
- `function_area`
- `industry`
- `primary_goal`
- `study_stage`
- `role_focus`
- `responsibility_scope`
- `organisation_scale`
- `time_zone`

`training_sessions.context_mode` records whether the session was selected in `work`, `mixed` or `personal` mode. An unanswered in-progress session can be reselected when the user's context mode changes before they begin.

## Skill evidence

`user_skill_scores` stores:

- `score` — the current 0–100 Development Score heuristic
- `reliability` — confidence in the evidence base
- `attempts` — raw answered observations
- `evidence_points` — weighted evidence used for reliability

A novel challenge contributes 1.0 evidence point; a repeated challenge contributes 0.35. This prevents familiar/repeated questions from increasing confidence as quickly as fresh evidence while still allowing reinforcement to count.

## Trusted scoring transaction

`record_scored_answer(...)` is callable only by the Supabase service role. It performs the scored-answer write in one database transaction:

1. validates the session/challenge relationship;
2. serializes concurrent writes for the user with a transaction advisory lock;
3. writes the response;
4. updates skill scores and weighted reliability;
5. records per-skill before/after evidence;
6. updates error patterns;
7. completes training/practice sessions when appropriate;
8. awards XP and daily streak movement;
9. writes the analytics event.

This avoids cross-device lost updates from the previous read-modify-write API sequence.

## Security boundary

Authenticated users retain RLS-backed read access to their own profile but no longer have direct INSERT/UPDATE/DELETE privileges on `profiles`. This prevents client-side editing of `is_admin`, XP, streaks or other privileged values. Profile mutations are made only by trusted server-side code.

The private schema also contains `mobile_api_rate_limits`, which is accessible only through a service-role-only rate-limit function used by the Supabase mobile Edge API.
