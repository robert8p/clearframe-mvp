# Cogni

Cogni is an adaptive judgement-training app for the AI age. It develops critical thinking, evidence evaluation, AI-output verification, source-quality judgement, decision-making under uncertainty and related human reasoning skills through short daily lessons and mixed-format practice.

## Active product

**Expo / React Native is the only active product client.**

All new product, UX and release work belongs in `mobile/` and ships through Expo / EAS. The former Next.js web client is retained only as legacy source while the frozen compatibility deployment is retired.

Vercel Git deployments are disabled in `vercel.json`; do not re-enable them.

## Active architecture

- **Client:** Expo / React Native in `mobile/`
- **Builds and releases:** Expo / EAS
- **Authentication:** Supabase Auth
- **Mobile API:** authenticated Supabase Edge Function `mobile-api`
- **Persistence and learning engine data:** Supabase Postgres
- **Sensitive grading/score writes:** server-side only, with answer keys hidden from the client
- **Session credentials:** persisted in native secure storage

The current mobile source has no Vercel API dependency. The old Vercel runtime may remain temporarily reachable only so previously installed builds keep working until users install a Supabase-backed Expo build; it is not part of the active architecture.

## Learning experience

Cogni combines:

- audience-aware and time-aware daily lessons
- adaptive mixed-format questions
- everyday vs work/study context selection based on the user's local timezone
- Development Scores with separate evidence confidence
- reduced evidence weight for repeated questions
- XP, streaks and engaging feedback
- canonical profile personalisation tied directly to content tags
- targeted, context-aware skill practice
- per-situation relevance feedback

## Audience contexts

The learner contexts are:

- Casual / personal growth
- University student
- Graduate / early career
- Junior professional
- Management
- Executive

Audience context changes scenario relevance and decision complexity, not the learner's underlying measured ability. Outside work/study hours, professional learners can deliberately receive life-native transfer scenarios while casual learners are never promoted into management/executive-only content.

## Mobile development

Work from `mobile/`.

Required local public environment values are documented in `mobile/.env.example`. There are no silent production fallbacks.

Validate before every build:

```bash
npm ci
npx expo install --check
npm run lint
npm run ui-audit
npm run logic-audit
npm run typecheck
```

Start locally with:

```bash
npx expo start
```

For an installable Android preview, use the repository's **EAS Android preview** workflow or the `preview` profile in `mobile/eas.json`.

## Security boundary

Authenticated mobile users can read their own profile but cannot directly update privileged profile columns such as `is_admin`, XP or streaks. Profile writes, grading, XP/streak awards, account deletion and adaptive-session creation are performed by the trusted mobile Edge API. Scoring updates are transactional and serialized per user to avoid cross-device lost updates.
