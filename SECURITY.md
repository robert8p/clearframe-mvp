# Cogni security

## Active mobile security boundary

- Supabase RLS is enabled on user-facing tables.
- Authenticated users can read only their own user-scoped profile/evidence rows.
- Authenticated clients no longer have direct INSERT/UPDATE/DELETE privileges on `profiles`; privileged fields such as `is_admin`, XP and streaks cannot be self-edited from the public client.
- Published challenge prompts and skills are readable to authenticated users where required by the product.
- Answer keys are isolated in an RLS-protected table with no authenticated-client read policy.
- The Supabase secret/service-role credential exists only in trusted Edge/server environments and is never bundled into Expo.
- The Expo app stores Supabase auth sessions in native SecureStore with a one-release migration from the previous SQLite/localStorage adapter.
- Mobile API calls require a valid Supabase JWT and are additionally rate-limited per user.
- Profile mutation, grading, XP/streak awards, session creation and account deletion run only in the authenticated Supabase `mobile-api` Edge Function.
- Scoring uses one transactional Postgres function with a per-user advisory lock to prevent concurrent lost updates.
- Repeated questions contribute reduced evidence to reliability.
- Unexpected server/database errors are logged server-side and returned to the app as sanitized 500 responses.
- The active mobile source contains no Vercel API dependency and no silent production backend fallback.

## Auth account lifecycle

The native app includes:

- email confirmation deep links;
- password recovery deep links;
- password update after a recovery session;
- authenticated permanent account deletion.

Before public release, confirm Supabase Auth allows the native redirect scheme `cogni://**` (or the exact confirmation/recovery routes).

## Current Supabase advisor item requiring dashboard configuration

Supabase Auth leaked-password protection is currently disabled. Enable it before a public release so compromised passwords are rejected against the platform's leaked-password protection service.

## Additional production-readiness work

Before a broad public launch, complete privacy notice/consent review, retention and deletion policy review, production monitoring/alerting, automated RLS/security regression tests beyond the current static audit, and penetration testing proportionate to the application risk. If legacy web/admin source is retained, treat it as a separate attack surface and remove it once no longer required.
