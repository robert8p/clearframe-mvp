# Database

Core relations: auth.users -> profiles; challenges -> challenge_answer_keys; challenges <-> skills through challenge_skill_mapping; users -> user_responses; users <-> skills through user_skill_scores; users -> user_error_patterns and analytics_events. Organisation tables exist but detailed B2B reporting is deferred.

The answer-key table has RLS enabled and intentionally has no authenticated-user select policy.

## Learning evidence (migration 004)

`user_responses.xp_awarded` stores the XP actually awarded for each response so completed-session summaries do not need to infer historical XP from a future scoring rule.

`user_response_skill_updates` records the before/after score, reliability and attempt count for each skill touched by a response. This enables Cogni to show exact session-level skill movement. Older sessions created before migration 004 do not have reconstructed deltas; the UI labels those skills as **trained** rather than fabricating movement.
