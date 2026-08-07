# Deployment — literal steps

## A. Supabase
1. Go to Supabase and click **New project**.
2. Choose an organisation, enter project name `clearframe-mvp`, create a strong database password and choose the UK/EU region appropriate to your pilot.
3. Wait until the project dashboard opens.
4. Left menu -> **SQL Editor** -> **New query**.
5. Open this repository file `supabase/migrations/001_initial.sql`, copy all text, paste into SQL Editor, click **Run**. Expected result: success with no blocking errors.
6. Create another query. Copy all of `supabase/migrations/002_seed.sql`, paste and **Run**. Expected result: 100 rows in `challenges`.
7. Project Settings / API (or **Connect**, depending on dashboard wording): copy Project URL, publishable key and service-role key. Never put the service-role key in a variable beginning `NEXT_PUBLIC_`.
8. For easiest closed-pilot testing, Auth -> Providers -> Email: decide whether to disable email confirmation. For public use, keep confirmation enabled and configure redirect URLs.
9. Table Editor -> `profiles`: after your first sign-up, set your own `is_admin` to `true` so the admin screens appear.

## B. GitHub
1. Create a new private repository called `clearframe-mvp`.
2. Upload the entire unzipped project contents, preserving folders.

## C. Vercel
1. Sign into Vercel -> **Add New -> Project**.
2. Import the `clearframe-mvp` GitHub repository.
3. Framework should be detected as Next.js. Do not change the build command.
4. Add environment variables from `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `OPENAI_API_KEY` is optional. Set `NEXT_PUBLIC_APP_URL` to the final Vercel URL after first deployment, then redeploy.
5. Click **Deploy**.
6. Expected result: landing page appears; create account; complete diagnostic; see skill scores; run training.

## If deployment fails
- “Missing Supabase…”: environment variable is missing or misnamed.
- “relation does not exist”: one or both SQL migrations were not run in the same Supabase project used by the app.
- Sign-up succeeds but login fails: check email confirmation settings and spam folder.
- Admin page redirects to dashboard: set your `profiles.is_admin=true` in Supabase Table Editor.
- No challenges: verify `select count(*) from public.challenges;` returns 100.
