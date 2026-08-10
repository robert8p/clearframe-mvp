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

## Run in Expo Go

From the repository:

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go. The app defaults to the live Cogni Supabase project and `https://gocogni.vercel.app` API. You can override the public values by copying `.env.example` to `.env`.

## Link to the Expo project you already created

The source deliberately does not guess an Expo owner or EAS project ID.

Either set:

```bash
EXPO_OWNER=<your Expo account or organisation>
EXPO_PROJECT_ID=<your EAS project UUID>
```

or, from this directory, run:

```bash
npx eas-cli@latest init
```

and choose the existing Cogni project. EAS will add/link the project ID.

## Build

After the project is linked:

```bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
```

For store-ready builds:

```bash
npx eas-cli@latest build --platform all --profile production
```

App identifiers are currently:

- iOS: `app.gocogni.cogni`
- Android: `app.gocogni.cogni`

These should be treated as permanent once store records/builds are created.

## Security

Only the Supabase publishable key exists in the native client. The Supabase service-role key and answer keys remain server-side. Native answer submission, daily-session creation and lesson completion use authenticated bearer-token API routes on the existing Next.js backend.
