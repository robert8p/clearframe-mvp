# Cogni database — v0.7.0

Core relations: `auth.users -> profiles`; `challenges -> challenge_answer_keys`; `challenges <-> skills` through `challenge_skill_mapping`; users -> `user_responses`; users <-> skills through `user_skill_scores`; users -> `user_error_patterns` and `analytics_events`; users -> `user_lesson_completions`; persisted daily `training_sessions` -> `training_session_challenges` and optionally one `daily_lesson`.

The answer-key table has RLS enabled and intentionally has no authenticated-user select policy. Grading uses the server-side service role.

## Migration 005 additions

`challenges`
- `interaction_type`: `single_choice | multi_select | ranking | classification | triage`
- `interaction_config jsonb`: format-specific metadata such as classification categories

`challenge_answer_keys`
- `correct_index` becomes nullable for non-single-choice formats
- `correct_answer jsonb` stores arrays/maps/generalised deterministic answers

`user_responses`
- `response_payload jsonb` stores generalised learner responses
- `score_fraction numeric(5,4)` stores graded alignment from 0 to 1
- existing rows are backfilled to 1 for correct and 0 for incorrect

`daily_lessons`
- lesson content, target skill, emoji, estimated duration, publication state and ordering

`user_lesson_completions`
- one completion per user per local date
- lesson XP is awarded idempotently server-side

`training_sessions`
- `lesson_id` links the lesson selected for that daily session

## Current seeded volume after migration 005

- 150 scored challenges total
- 120 single-choice
- 30 alternative-format challenges
- 15 published daily lessons

The migration also updates the original 100 single-choice answer keys/options so correct positions are exactly 25/25/25/25 across A–D.
