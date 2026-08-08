# Cogni MVP v0.7.0

**Production URL:** https://gocogni.vercel.app

Cogni is a mobile-first adaptive human-judgement training product for the AI age. It combines a short daily lesson with mixed-format judgement practice, transparent Development Scores, evidence confidence, immediate feedback, and a motivating but non-manipulative reward loop.

## What is implemented

- Email/password authentication with Supabase Auth
- 12-item diagnostic drawn from the original validated-format diagnostic pool
- Adaptive 0–100 Development Scores with reliability shown separately
- **Daily lesson before training**, aligned to the learner's current priority skill
- **15 story-led lessons** with memorable examples, a reveal moment, a short learner-generated response, a thinking principle and an AI-age application
- Persisted, resumable **five-item mixed-format daily training**
- **150 total challenges** after migration 005:
  - 120 single-choice MCQs
  - 8 multi-select audits
  - 8 ranking tasks
  - 8 classification/sorting tasks
  - 6 scenario triage decisions
- Original 100 MCQs rebalanced to an exact **25 A / 25 B / 25 C / 25 D** correct-answer distribution
- 20 additional story-led MCQs balanced **5 / 5 / 5 / 5** across A–D
- Future admin-authored MCQs automatically place the correct option in the least-used answer position
- Partial-credit scoring for multi-select, ranking and classification formats
- Deterministic server-side grading with answer keys hidden from browser clients
- Immediate explanation, thinking principle, AI-age application and reasoning-pattern feedback
- Confidence capture, response-time capture and error-pattern logging
- Exact per-response skill score movement and evidence-reliability tracking
- XP, streaks, answer microinteractions, haptics where supported and session celebrations
- Skills, progress, achievements, settings
- Admin challenge creation
- Instrumented core funnel events and internal analytics
- Optional OpenAI-grounded coaching endpoint with deterministic fallback
- RLS and service-role separation
- Future-ready organisation tables
- Exact Cogni brand treatment and production origin `https://gocogni.vercel.app`

## Existing Cogni deployment: upgrade order

**Run the database migration before deploying the v0.7.0 code.** The new code expects the new lesson and interaction-format columns/tables to exist.

1. Supabase -> SQL Editor -> New query.
2. Run `supabase/migrations/005_learning_formats_and_lessons.sql` in full.
3. Confirm the query completes successfully.
4. Replace the GitHub repository contents with this v0.7.0 project.
5. Commit and push.
6. Let Vercel deploy.
7. Open Cogni and complete the daily lesson before the five-question session.

Migrations 001–004 should **not** be rerun on an existing Cogni database if they were already applied.

## Fresh local setup

1. Create a Supabase project.
2. Run migrations `001_initial.sql` through `005_learning_formats_and_lessons.sql` in numerical order.
3. Copy `.env.example` to `.env.local` and fill the Supabase values. OpenAI is optional.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

See `DEPLOYMENT.md` for literal deployment instructions and `LEARNING_DESIGN_RESEARCH.md` for the evidence behind the learning-format changes.
