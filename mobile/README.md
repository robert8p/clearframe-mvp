# Cogni Mobile — Expo / React Native

This directory is the native iOS/Android consumer app for Cogni.

The existing Next.js app remains the web, admin and analytics surface. Both clients use the same Supabase users, profiles, skill scores, responses, XP, streaks, content and adaptive learning engine.

## What works natively

- Supabase sign up / sign in with persisted sessions
- mandatory learning-context selection plus optional function/industry/goal context
- audience-aware hybrid starting check
- daily audience-aware lesson
- daily adaptive mixed-format training
- single choice, multi-select, ranking, classification and triage interactions
- server-side grading and answer-key protection
- skill-score/reliability updates, XP and streaks
- Home, Skills, Train, Progress and Profile native tabs
- extra three-question skill practice after the daily session
- animated Cogni orb and native mobile layout

## Current build status

The Expo/EAS project is linked and the first installable Android internal-preview build has completed successfully.

Routine mobile changes are validated by the `Expo mobile CI` GitHub Actions workflow. Installable Android previews are intentionally created only when requested through the `EAS Android preview` workflow, so ordinary source commits do not start unnecessary EAS builds.

## Run in Expo Go

From the repository:

```bash
cd mobile
npm ci
npx expo start
```

Scan the QR code with Expo Go. The app defaults to the live Cogni backend. You can override public values by copying `.env.example` to `.env`.

## Build an installable Android preview

In GitHub, open **Actions**, choose **EAS Android preview**, then choose **Run workflow** on `main`.

The workflow first runs a strict dependency install, Expo dependency compatibility check, TypeScript check and Expo-project-link check. It then requests an internal Android preview build from EAS.

Local equivalent:

```bash
cd mobile
npm ci
npx expo install --check
npm run typecheck
npx eas-cli@21.7.1 build --platform android --profile preview
```

## Production builds

Store-ready builds are not automated yet. When store release work begins, use the production build profile and configure the Android/iOS store credentials and submission path deliberately.

App identifiers are currently:

- iOS: `app.gocogni.cogni`
- Android: `app.gocogni.cogni`

These should be treated as permanent once store records/builds are created.

## Security

Only the Supabase publishable key exists in the native client. The Supabase service-role key and answer keys remain server-side. Native answer submission, daily-session creation and lesson completion use authenticated bearer-token API routes on the existing Next.js backend.
