# Cogni MVP v0.5.1

Production URL: https://gocogni.vercel.app

This build fixes the v0.5.0 PostCSS syntax failure caused by literal `\n` tokens in `app/globals.css`.

# Cogni

**Production URL:** https://gocogni.vercel.app

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


## v0.5.0 UI refresh
- Exact Cogni brain + wordmark asset from the supplied reference is shown across public, consumer and internal pages.
- Consumer navigation now follows the reference four-tab pattern: Home, Explore, Progress, Profile.
- Shared mobile shell, card density, spacing and brand treatment were tightened to match the supplied reference more closely.
