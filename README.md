# Cogni

Cogni is an adaptive judgement-training app for the AI age. It develops critical thinking, evidence evaluation, AI-output verification, source-quality judgement, decision-making under uncertainty and related human reasoning skills through short daily lessons and mixed-format practice.

## Current version

**v0.8.2** — audience-aware learning with improved mobile readability and typography.

Production: https://gocogni.vercel.app

## Learning experience

Cogni combines:

- audience-aware daily lessons
- adaptive mixed-format questions
- Development Scores and evidence confidence
- XP, streaks and engaging feedback
- personalised skill insights
- targeted skill practice
- admin-managed audience-aware content

## Audience contexts

The current learner contexts are:

- University student
- Graduate / early career
- Junior professional
- Management
- Executive

Audience context changes scenario relevance and decision complexity, not the learner's underlying measured ability.

## Deployment

The application is a Next.js app deployed to Vercel with Supabase providing authentication and persistence.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL=https://gocogni.vercel.app`

`OPENAI_API_KEY` and `OPENAI_MODEL` are optional for AI coaching features.
