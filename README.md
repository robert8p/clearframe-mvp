# Cogni MVP

Cogni is a mobile-first adaptive human-judgement training product for the AI age.

## What is implemented

- Email/password authentication with Supabase Auth
- 12-item diagnostic selected from a 100-challenge seed bank
- Adaptive 0–100 Development Scores with reliability shown separately
- Persisted, resumable five-item daily training with adaptive targeting, diversity and AI-verification coverage
- Deterministic server-side grading with answer keys hidden from browser clients
- Confidence capture, response-time capture and error-pattern logging
- XP and streaks
- Skills, progress, achievements, settings
- Admin challenge creation
- Instrumented core funnel events and basic internal analytics
- Optional OpenAI-grounded coaching endpoint with deterministic fallback
- RLS and service-role separation
- Future-ready organisation tables

## Local start

1. Create a Supabase project.
2. In SQL Editor run `supabase/migrations/001_initial.sql`, then `002_seed.sql`, then `003_training_sessions.sql`.
3. Copy `.env.example` to `.env.local` and fill the four Supabase values. OpenAI is optional.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

See `DEPLOYMENT.md` for literal click-by-click instructions.


## Learning evidence upgrade (0.4)

Migration `004_learning_evidence.sql` adds exact per-response skill movement and XP evidence. The diagnostic results page now presents an evidence-led Judgement Profile, and each completed daily session reports session XP, skills affected, reasoning-error patterns, streak and a deterministic personalised insight. Historical sessions without per-response deltas are shown as skills trained rather than reconstructing unsupported score changes.
