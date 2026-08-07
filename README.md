# Clearframe MVP

Working codename for a Duolingo-style adaptive human-judgement training product.

## What is implemented

- Email/password authentication with Supabase Auth
- 12-item diagnostic selected from a 100-challenge seed bank
- Adaptive 0–100 Development Scores with reliability shown separately
- Five-item daily training prioritising weaker skills
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
2. In SQL Editor run `supabase/migrations/001_initial.sql`, then `002_seed.sql`.
3. Copy `.env.example` to `.env.local` and fill the four Supabase values. OpenAI is optional.
4. Run `npm install`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

See `DEPLOYMENT.md` for literal click-by-click instructions.
