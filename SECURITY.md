# Security

- Supabase RLS is enabled on user-facing tables.
- Users can read only their own profile, responses, scores and events.
- Published challenge prompts are readable by authenticated users.
- Answer keys are isolated in a no-browser-policy table.
- Service-role credentials are used only in server route handlers.
- Admin writes require both an authenticated user and `profiles.is_admin=true`.
- OpenAI keys remain server-only.

Before public release: add rate limiting, CSRF review for state-changing custom routes, security headers/CSP, automated RLS tests, audit-log retention, account deletion workflow, privacy notice and penetration testing appropriate to risk.
