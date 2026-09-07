# Cogni 0.4.5 — Nightfall visual release

User direction: implement the approved Cogni visual concept in the actual app and deliver a downloadable Android Expo preview. iPhone work is deferred.

## Implementation

The application source is committed, not merely a design proposal. Compiled application commit: `df97ce58b85e9a2060a8aa95ea02c9e2166e2534`. Starting baseline: `308eb6fef139f61cd633f96a89ebb4ab408dc096` on the 0.4.4 release branch.

- Midnight navy reading surfaces, indigo/violet depth, cyan highlights, teal success surfaces and restrained warm accents.
- Bundled text-free crop of the user's approved illustrated welcome artwork, with gradient edge treatment. A native illustrated moonlit mountain/lake scene appears in the main training card. Decorative layers do not intercept input or enter the Android accessibility tree.
- Luminous gradient primary buttons, clear secondary controls, continuous rounded cards, refined title hierarchy, stronger selected-answer boundaries and round answer badges.
- Four real skill shortcuts on Home, linked to their actual focused-practice routes and existing entitlement checks. Labels wrap and the layout adapts at larger font settings.
- A continuous multicolour progress ring driven only by the actual recent average. Missing scores remain missing; larger text uses a readable text presentation instead of cramped rings.
- Saved ideas receive subject motifs, while the optional weekly rhythm receives a real progress bar. Offline storage, account isolation, controls for sharing/deletion and the option to have no goal remain.
- Existing five main navigation destinations, live scoring, answer confidence requirements, duplicate-submit protection, sessions, recovery routes, optional sounds/haptics and server-side entitlement decisions are retained.

## Deliberate differences from the concept board

This is a native implementation of the art direction, not a screenshot pasted over the application. The interface does not manufacture the concept's 72% mastery, 12% improvement, example streak or saved-idea dates. It retains actual features and data. White button labels use darker gradient stops for legibility; glow and borders supply the luminous treatment. The bundled portrait is a compact crop of the supplied concept, not a new high-resolution illustration. No new native dependencies, remote art requests, autoplay or decorative looping animation were introduced.

This release updates the native Android app; it does not publish a website redesign or an iPhone build. Paid subscriptions remain disabled for the preview.

## Source verification completed

Build/check run: https://github.com/robert8p/clearframe-mvp/actions/runs/34151558176

The source job and backend job succeeded. Checks include 127 mobile tests, TypeScript, lint, Expo dependency compatibility, UI/accessibility invariants, base palette contrast, authentication, purchases/entitlements, copy audits, Android JavaScript export and unchanged server engine/monetisation/webhook checks.

The first configuration attempt caught an incomplete function in the source transport manifest; its full verified contents were restored without weakening checksum checks. The following source pass caught an optional skill route type; the actual component was repaired before requesting the cloud build.

## Exact Expo build and installed verification

Expo Android build: https://expo.dev/accounts/cogniapp/projects/cogni/builds/f432c37f-f24e-42a5-932a-77ea68094a01

The build request references the exact application commit above. A request alone is not a finished downloadable release. The build workflow requires FINISHED status, downloads the resulting APK, checks identity/signing/permissions/bundled configuration and records its actual checksum before producing the APK evidence artifact.

Installed verification run: https://github.com/robert8p/clearframe-mvp/actions/runs/34151959048

Four independent Android API 36 emulator lanes cover upgrade from the previous Expo build, existing interaction regressions, sample/private-tool behavior and screenshots of actual normal/160%-text screens. Each lane checks identical application source and APK bytes. The tests use only their own disposable accounts and remove those accounts afterward. Test-only copy fixes are allowed; application changes require a new build.

At creation of this report the cloud build and installed checks are still in progress. Do not describe this report as proof of their completion. Physical-device feel, perceptual sound/haptic quality and a human screen-reader evaluation remain outside automated verification.
