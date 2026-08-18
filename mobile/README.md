# Cogni Mobile — Expo / React Native

This directory is the active Cogni product client for iOS and Android.

## Architecture

- Expo Router / React Native client
- Supabase Auth for identity
- SecureStore-backed persisted sessions
- Supabase Edge Function `mobile-api` for trusted mobile operations
- Supabase Postgres for profiles, learning content, sessions, responses, scoring and analytics
- EAS for installable and store-ready builds

The mobile app does **not** use Vercel. There is no API-URL fallback and no embedded service-role credential or answer key.

## Native product coverage

- sign up, sign in, email confirmation and password recovery
- permanent in-app account deletion
- canonical learning-context personalisation
- device-timezone-aware daily boundaries and situations
- audience-aware hybrid starting check
- time-aware daily lesson and adaptive mixed-format training
- time-aware three-question skill practice
- single choice, exact-count multi-select, ranking, classification and triage
- server-side answer-key protection and grading
- transactional skill updates, XP and streaks
- reduced reliability evidence for repeated questions
- Home, Skills, Train, Progress and Profile tabs
- situation relevance feedback
- reduced-motion and accessibility support

## Local development

Copy `.env.example` to `.env` and supply the intended Supabase project's **public** URL and publishable key. Local development intentionally has no production fallback.

```bash
cd mobile
npm ci
npx expo install --check
npm run validate
npx expo start
```

`npm run validate` runs ESLint, the UI/accessibility regression audit, the logic/security regression audit and TypeScript.

## Android preview

In GitHub Actions choose **EAS Android preview** and run it on `main`. The workflow validates dependencies, lint, UI invariants, architecture/security invariants and TypeScript before requesting an EAS internal APK build.

Equivalent local command:

```bash
npx eas-cli@21.7.1 build --platform android --profile preview
```

## Production builds

The production profile is defined in `eas.json`:

```bash
npx eas-cli@21.7.1 build --platform android --profile production
npx eas-cli@21.7.1 build --platform ios --profile production
```

App identifiers:

- iOS: `app.gocogni.cogni`
- Android: `app.gocogni.cogni`

Treat those identifiers as permanent once store records are created.

## Security notes

Only public Supabase client values are available to the native bundle. Sessions are stored in the platform secure store, with a one-release migration path from the previous SQLite/localStorage adapter. Authenticated clients cannot directly update privileged profile values. Grading, account deletion, profile mutations, session creation, scoring, XP/streak writes and rate limiting are handled by trusted Supabase server code.

Before distributing a public production release, confirm Supabase Auth's redirect allow-list contains the Cogni native scheme (`cogni://**`) and enable leaked-password protection in the Supabase Auth settings.
