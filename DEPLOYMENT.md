# Cogni deployment — Expo / EAS only

Cogni's active client is the Expo / React Native app in `mobile/`. Vercel is no longer an active build target.

## Golden rule

Do not create or re-enable Vercel deployments for product development. `vercel.json` disables Vercel Git deployments.

The existing Vercel runtime is temporarily frozen because the current Expo app still uses its `/api/mobile/*` endpoints. Remove that runtime only after those endpoints have been moved to the Expo/Supabase architecture and the mobile client has been updated.

## Before every mobile build

From `mobile/` run:

```bash
npm ci
npx expo install --check
npm run ui-audit
npm run typecheck
```

All four checks must pass.

## Development

Start with Expo Go where possible:

```bash
npx expo start
```

Use a development/preview build only when required by native configuration or when testing the installable app itself.

## Installable Android preview

The repository contains `.github/workflows/eas-android-preview.yml`.

It validates the mobile project and starts an EAS `preview` build using `mobile/eas.json`.

Equivalent local command from `mobile/`:

```bash
npx eas-cli build --platform android --profile preview
```

The preview profile creates an installable APK.

## Production mobile release

Use the `production` profile in `mobile/eas.json`:

```bash
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Use EAS Submit when the store release is ready.

## Supabase

Supabase remains the source of truth for authentication, profiles, learning content, scores, sessions and analytics. Database migrations in `supabase/migrations/` remain authoritative and should be applied in numerical/timestamp order as required.

## Vercel decommission status

- New Vercel Git deployments: **disabled**
- Vercel web client: **legacy / no further development**
- Active product client: **Expo only**
- Existing Vercel mobile API runtime: **temporarily frozen compatibility layer**
- Final removal condition: mobile `/api/mobile/*` endpoints have moved off Vercel and the Expo client points to the replacement backend

This prevents a destructive cutover: deleting Vercel before replacing the API would break the current mobile app.
