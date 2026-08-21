# Cogni deployment — Expo / EAS + Supabase

Cogni's active client is the Expo / React Native app in `mobile/`. Vercel is not an active build or backend target for current source.

## Active deployment path

- Expo / EAS builds the iOS/Android app.
- Supabase Auth provides identity.
- Supabase Edge Function `mobile-api` is the trusted mobile backend.
- Supabase Postgres stores profiles, content, sessions, answers, scores and analytics.

`vercel.json` disables Vercel Git deployments. Do not re-enable them.

## Before every mobile build

From `mobile/` run:

```bash
npm ci
npx expo install --check
npm run lint
npm run ui-audit
npm run logic-audit
npm run typecheck
```

All checks must pass. The maintained CI and EAS workflows also export an Android production bundle and verify that the intended Supabase URL and publishable key were actually compiled into it. This is a release gate, not merely a source-code check.

## Development

Create `mobile/.env` from `.env.example` and set the intended Supabase project's public URL and publishable key. There is intentionally no silent production fallback.

```bash
npx expo start
```

## Installable Android preview

Use `.github/workflows/eas-android-preview.yml` or run from `mobile/`:

```bash
npx eas-cli@21.7.1 build --platform android --profile preview
```

The preview profile creates an installable APK after the full validation suite passes. It disables EAS build caches so a replacement APK is produced from a clean native workspace.

## Local signed Android verification

`mobile/eas.json` retains a `localVerification` profile for controlled use when cloud EAS build capacity is unavailable. It uses the existing remotely managed signing credentials but performs the native Android build on the local/CI machine:

```bash
npx eas-cli@21.7.1 build \
  --platform android \
  --profile localVerification \
  --local \
  --non-interactive \
  --output /tmp/cogni.apk
```

A locally built artifact is not release-ready merely because Gradle succeeded. Before distribution, inspect the exact APK for identity, signing certificate, permissions, ABIs, 16 KB page alignment and compiled runtime configuration, then clean-install and cold-launch that same file on supported Android runtime versions. The maintained regression script is `.github/scripts/verify-cogni-apk-runtime.sh`.

## Production mobile release

Use the production profile in `mobile/eas.json`:

```bash
npx eas-cli@21.7.1 build --platform android --profile production
npx eas-cli@21.7.1 build --platform ios --profile production
```

Use EAS Submit when store credentials and listings are ready.

## Supabase deployment

Database changes live in `supabase/migrations/` and should be applied in migration order. Trusted mobile backend code lives in `supabase/functions/mobile-api/` and is deployed as the authenticated `mobile-api` Edge Function.

Before public release, Supabase Auth must allow the native deep-link scheme (`cogni://**`) for email confirmation/password recovery and leaked-password protection should be enabled.

## Vercel decommission status

- New Vercel Git deployments: **disabled**
- Active product client: **Expo only**
- Active mobile backend: **Supabase Edge Function**
- New Expo source dependency on Vercel: **none**
- Frozen historic Vercel runtime: may remain reachable only for older already-installed app builds until users install the Supabase-backed Expo build

Once the replacement Expo build is installed on test devices, the old Vercel project/runtime can be deleted without affecting the new app. The Vercel connector used by this project does not expose project deletion, so that final destructive removal is a deliberate Vercel-dashboard action rather than an application-code step.
