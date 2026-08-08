# Cogni v0.4.0 — QA report

## Upgrade delivered
- Rich **Your Judgement Profile** after the diagnostic:
  - emerging strength;
  - highest-value measured development area;
  - explicit evidence-confidence label;
  - observed reasoning-error pattern and an actionable countermeasure;
  - three-skill weekly focus path;
  - diagnostic accuracy vs confidence calibration.
- Rich **Session Complete** screen after every daily session:
  - XP earned in that session;
  - score and average confidence;
  - current streak;
  - exact skills affected and score movement where evidence exists;
  - mistakes/reasoning patterns and their counts;
  - one deterministic, data-grounded personalised insight;
  - next skill focus.
- AI Study Buddy grounding expanded to include evidence confidence, recurring error pattern and the three-skill weekly focus path.

## Evidence model
Migration `004_learning_evidence.sql` adds:
- `user_responses.xp_awarded` so historical/session XP is stored rather than inferred from future rules;
- `user_response_skill_updates`, which stores score/reliability/attempt before-and-after values for every skill touched by a response.

Historical sessions created before migration 004 intentionally do **not** receive fabricated skill deltas. The UI labels those skills as `trained` instead.

## Static QA performed
- All 41 TypeScript/TSX source files passed TypeScript transpile/syntax validation.
- Strict semantic TypeScript QA passed using temporary local declarations for external packages; the temporary QA declarations are not included in the shipped repository.
- All local `@/...` imports resolve to real files.
- No runtime source file contains the old Clearframe brand name.
- No temporary debug API route is present.
- Insight helper functions were executed with representative score/error data and returned the expected Early-evidence label, focus pathway, pattern narrative and session insight.

## Environment limitation
The build environment's internal npm mirror does not expose `@supabase/ssr@0.12.3`, so a genuine dependency-backed `next build` cannot be executed here. Vercel previously demonstrated that it can install the application's dependency set. The source has therefore been validated using syntax, strict semantic and local-import QA before packaging.
