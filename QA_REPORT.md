# Cogni v0.7.0 QA report

## Learning/content upgrade

- Added a mandatory daily micro-lesson before daily training.
- Added 15 published lessons, one aligned to each core skill.
- Added 30 non-MCQ challenges: 8 multi-select, 8 ranking, 8 classification and 6 triage.
- Added 20 new story-led MCQs.
- Rebalanced the original 100 MCQs from the previous B/C-only skew to an exact 25 A / 25 B / 25 C / 25 D distribution.
- New 20 story MCQs are exactly 5 / 5 / 5 / 5 across A–D.
- Admin-created single-choice questions are automatically rotated to the currently least-used correct-answer position.
- Mixed-format session selection preferentially includes alternative formats while retaining adaptive skill targeting and challenge-type diversity.
- Added partial-credit scoring for multi-select, ranking and classification.
- Existing binary response history is safely backfilled to score_fraction 1/0.
- Lesson completion is idempotent and awards +5 XP only on the first completion for that day.

## Product-flow checks

- Dashboard daily goal counts lesson + five questions.
- Dashboard sends users to `/lesson` until today's lesson is complete.
- `/training` redirects to `/lesson` when required.
- Existing persisted training sessions remain resumable.
- Lesson assignment is persisted to the daily training session.
- Lesson reflection is deliberately not sent for automated grading.
- Cogni branding remains visible in immersive lesson/training flows.

## Source/build QA performed

- `scripts/qa_seed.py`: PASS
  - 120 MCQs total after migration 005 content is considered
  - all 120 MCQs balanced across answer positions
  - 15 lessons
  - 30 alternative-format challenges
- CSS parsed successfully with PostCSS/tinycss-style parser: 0 syntax errors.
- TypeScript syntax/transpile scan across 48 TS/TSX files: 0 failures.
- Strict semantic TypeScript pass using temporary external-package declarations: PASS.
- Local `@/` import resolution scan: 0 unresolved imports.
- No new external animation/question-format package required.
- Full dependency-backed Next.js build remains a Vercel check because the sandbox npm mirror does not provide the project's Supabase SSR dependency version.

## Migration requirement

Migration `005_learning_formats_and_lessons.sql` must run successfully on the existing Supabase project **before** v0.7.0 application code is deployed.
