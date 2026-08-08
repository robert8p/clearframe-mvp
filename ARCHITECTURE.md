# Cogni architecture — v0.7.0

Cogni remains one Next.js application with Supabase as the persistence/auth layer. Browser clients never receive the answer-key table directly; grading and state updates happen in server routes using the service role after authenticating the user.

## Daily flow

`Dashboard -> Daily Lesson -> Persisted 5-item Training Session -> Session Complete`

The daily training session is created/persisted before the lesson so Cogni can align the lesson to the session's priority skill. `training_sessions.lesson_id` stores that assignment. `/training` enforces lesson completion for the current date before rendering questions.

## Mixed interaction engine

A common `Challenge` type drives five interfaces:

- single choice
- multi-select
- ranking
- classification
- triage

`interaction_type` chooses the renderer/evaluator and `interaction_config` stores format-specific metadata. `correct_answer jsonb`, `response_payload jsonb` and `score_fraction` allow deterministic server grading without creating one database table per format.

## Adaptive sequencing

The existing recommendation engine still targets measured weak skills, second-priority skills, variety, spaced exposure and AI-output verification. v0.7 additionally tracks interaction-format counts and preferentially adds non-MCQ formats when available, while preserving the previous challenge-type diversity caps.

## Learning evidence

Each response writes the observed score fraction, confidence, response time, error pattern, XP and exact before/after skill state. Partial-credit formats therefore influence Development Scores proportionally rather than pretending every response is binary.

Daily lesson free-text reflection is intentionally local and ungraded in v0.7. It exists to induce generation/self-explanation, not as an unvalidated assessment signal.
