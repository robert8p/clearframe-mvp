# Database

Core relations: auth.users -> profiles; challenges -> challenge_answer_keys; challenges <-> skills through challenge_skill_mapping; users -> user_responses; users <-> skills through user_skill_scores; users -> user_error_patterns and analytics_events. Organisation tables exist but detailed B2B reporting is deferred.

The answer-key table has RLS enabled and intentionally has no authenticated-user select policy.
