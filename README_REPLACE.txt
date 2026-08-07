CLEARFRAME STEP 15 — PERSISTED, RESUMABLE DAILY TRAINING

Replace/add these files in the GitHub repository using the same paths:

1. ADD:
   lib/dates.ts

2. REPLACE:
   lib/recommendation.ts

3. REPLACE:
   app/(product)/training/page.tsx

4. REPLACE:
   components/ChallengeRunner.tsx

5. REPLACE:
   app/api/answer/route.ts

Migration 003_training_sessions.sql must already have been run in Supabase.

What this change does:
- Creates one stable daily training session per user.
- Persists the exact five selected challenges and why each was selected.
- Resumes the same session after refresh.
- Prevents a training answer being submitted against a challenge not assigned to that session.
- Automatically marks the persisted session complete after all assigned questions are answered.
- Uses Europe/London as the MVP application-day boundary by default.
  A future user-timezone setting can replace this without changing the session model.

After committing these files, wait for Vercel to deploy successfully before opening /training.
