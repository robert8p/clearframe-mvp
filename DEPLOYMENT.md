# Cogni v0.7.0 deployment — literal steps

Production URL: `https://gocogni.vercel.app`

## If you are upgrading the existing Cogni app

Do these steps in this exact order.

1. Open **Supabase** and select the database used by `gocogni.vercel.app`.
2. In the left menu click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/005_learning_formats_and_lessons.sql` from this repository.
5. Copy the **entire file** into the Supabase SQL editor.
6. Click **Run**.
7. Wait for the query to finish successfully. Do not deploy the new application code before this succeeds.
8. Optional verification query:

```sql
select count(*) as challenges from public.challenges;
select count(*) as lessons from public.daily_lessons where is_published = true;
```

Expected after migration 005:
- `challenges` = **150**
- published `lessons` = **15**

9. Replace the GitHub repository contents with the v0.7.0 project contents.
10. Commit and push to `main`.
11. Vercel should redeploy automatically.
12. When the deployment is Ready, open `https://gocogni.vercel.app`.
13. Sign in with your existing test account.
14. From Home, the daily flow should now be **Daily lesson -> five mixed-format questions -> personalised completion insight**.

You do **not** need to rerun migrations 001–004 on the existing database if they have already been applied.

## Fresh Supabase setup only

For a brand-new database, run these files in numerical order:

1. `001_initial.sql`
2. `002_seed.sql`
3. `003_training_sessions.sql`
4. `004_learning_evidence.sql`
5. `005_learning_formats_and_lessons.sql`

Migration 005 adds the mixed interaction formats, partial-credit response fields, lesson tables, 15 lessons, 30 alternative-format challenges, 20 new story-led MCQs and rebalances the original 100 MCQ answer positions.

## Vercel environment variables

In Vercel -> Project -> Settings -> Environment Variables, confirm:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL=https://gocogni.vercel.app`
- `OPENAI_API_KEY` is optional
- `OPENAI_MODEL` is optional

Then redeploy if any environment variable changed.

## Supabase authentication URL settings

Supabase -> Authentication -> URL Configuration:

- **Site URL:** `https://gocogni.vercel.app`
- **Redirect URL:** `https://gocogni.vercel.app/**`

For closed-pilot testing without custom SMTP, email confirmation can be disabled temporarily. Re-enable confirmation and configure a proper transactional email provider before a public launch.

## What to expect in v0.7.0

The learner is sent to a roughly three-minute lesson before the daily test. The lesson includes a memorable story, twist, principle, short ungraded generate-before-reveal prompt and AI-age application. Completion awards 5 XP once per day.

The five-question session can then contain single-choice, multi-select, ranking, classification and triage tasks. The recommender preferentially includes alternative formats while retaining adaptive skill targeting, AI-verification coverage and challenge-type diversity.

## Troubleshooting

- **`column interaction_type does not exist` / `relation daily_lessons does not exist`:** migration 005 was not successfully run against the database Vercel is using.
- **No lesson appears:** verify `select count(*) from public.daily_lessons where is_published=true;` returns 15.
- **Only old question formats appear today:** a persisted training session may already have been created before the upgrade. Existing sessions intentionally keep their assigned questions. A newly generated session will use the v0.7.0 mixed-format recommender.
- **`Email rate limit exceeded`:** this is Supabase Auth's email service, not the question engine. For testing, use an existing account or temporarily disable Confirm Email; for production, configure custom SMTP.
- **Admin redirects:** set your own `profiles.is_admin=true`.
