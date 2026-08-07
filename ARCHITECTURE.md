# Architecture

## Product architecture
A single responsive Next.js application handles marketing, authentication, diagnostic, adaptive training, administration and analytics. Supabase provides PostgreSQL and authentication. Objective challenge grading happens in Next.js server routes; correct answers are kept in a separate table with no browser RLS policy. OpenAI is optional and limited to coaching/free-text extensions, never the deterministic source of truth for objective challenges.

## Boundaries
- Browser: presentation, Supabase auth session, published challenge text.
- Next.js server: authentication checks, grading, skill-score mutation, admin operations, optional LLM calls.
- Supabase: durable learning evidence, RLS, content, profiles, analytics.
- OpenAI: optional explanatory intelligence; no service credential reaches the browser.

## Deliberate omissions
No microservices, vector database, queue, external analytics product or live content generation pipeline in V1.
