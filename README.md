# Cogni

Cogni is an adaptive judgement-training app for the AI age. It develops critical thinking, evidence evaluation, AI-output verification, source-quality judgement, decision-making under uncertainty and related human reasoning skills through short daily lessons and mixed-format practice.

## Active product

**Expo / React Native is now the only active client build.**

All new product, UX and release work should be made in `mobile/` and shipped through Expo / EAS. The former Next.js web client is retained only as legacy source while any remaining server-side dependencies are migrated away from Vercel.

Vercel Git deployments are disabled in `vercel.json`; do not re-enable them for product development.

## Learning experience

Cogni combines:

- audience-aware daily lessons
- adaptive mixed-format questions
- Development Scores and evidence confidence
- XP, streaks and engaging feedback
- personalised skill insights
- targeted skill practice
- audience-aware content

## Audience contexts

The learner contexts are:

- Casual / personal growth
- University student
- Graduate / early career
- Junior professional
- Management
- Executive

Audience context changes scenario relevance and decision complexity, not the learner's underlying measured ability.

## Active architecture

- **Client:** Expo / React Native in `mobile/`
- **Mobile builds:** Expo / EAS
- **Authentication and persistence:** Supabase
- **Legacy server runtime:** the existing Vercel deployment remains temporarily available only because the current Expo client still calls its `/api/mobile/*` endpoints. It is frozen: no new Vercel builds should be produced.

The remaining decommission step is to move those mobile API endpoints to the Expo/Supabase architecture and then remove the Vercel project/runtime completely. Do not delete the existing Vercel runtime before that migration or the installed Expo app will lose Home, Train, answers, profile and practice API access.

## Mobile development

Work from `mobile/`.

Useful commands:

```bash
npm ci
npx expo install --check
npm run ui-audit
npm run typecheck
npx expo start
```

For an installable Android preview, use the repository's **EAS Android preview** GitHub workflow or EAS CLI with the `preview` profile in `mobile/eas.json`.
