# Cogni 0.3.2 Android rebuild verification

Last verified: 21 August 2026

## Verdict

**PASS — installable internal APK ready for physical Samsung confirmation.**

The crashing 0.3.1 APK was not used as the basis for this verdict. Cogni 0.3.2 was rebuilt from a clean native Android workspace with Expo's local EAS build path and the existing managed Cogni signing credentials. The exact resulting APK was inspected and then installed and cold-launched on Android 15 and Android 16 emulators.

## Confirmed 0.3.1 root cause

The exact crashing 0.3.1 APK terminated during JavaScript startup with:

- `Cogni is missing EXPO_PUBLIC_SUPABASE_URL`
- `FATAL EXCEPTION: mqt_v_native`

The production Supabase URL and publishable key were absent from the compiled APK bundle. The source accessed Expo public environment variables through a computed `process.env[name]` lookup, so Metro did not inline them into the native production bundle.

## Corrective rebuild

Cogni 0.3.2:

- references both Expo public settings statically;
- fails visibly rather than crashing if a future build is malformed;
- removes the retired SQLite/localStorage adapter from startup;
- keeps SecureStore for persistent sessions with a non-crashing in-memory fallback;
- prevents dynamic Expo environment lookup through the logic/security audit;
- verifies the production URL and publishable key in every exported Android bundle;
- supports a local signed verification build when cloud EAS capacity is unavailable.

## Exact tested APK

- App: **Cogni 0.3.2**
- Package: `app.gocogni.cogni`
- Version code: **8**
- Minimum SDK: **24**
- Target SDK: **36**
- Exact tested source tree: `a87c35003293e424ba3549fdc9d14a2a8b36555e`
- Product fix merged to main: `77d5bc85f7d45fced6e2516b1f69ce02994241df`
- Local verification PR merged to main: `32ce5f1c89254f362136298f3857bf84d37dbb4d`
- APK SHA-256: `b2bdbdd70ba4440b09dab585cf2598855c9936dd10f8bf0cbb44834194e14adf`
- Signing certificate SHA-256: `e0bfda379dfa0e11aee798e443ce3b33d006d83b7857062f8f639ca7f7572c7e`
- GitHub Actions verification run: `32430604484`

## Binary gates passed

- clean local native/EAS build from an empty generated Android project;
- production Supabase URL embedded in the exact APK bundle;
- production Supabase publishable key embedded in the exact APK bundle;
- valid APK/ZIP archive;
- package, app label, version name and version code correct;
- Android APK Signature Scheme v2 valid;
- signer matches the established Cogni certificate;
- 16 KB page alignment validation passed;
- `arm64-v8a` and `x86_64` native libraries present;
- Internet permission present;
- overlay and legacy external-storage permissions absent;
- full Expo dependency, ESLint, UI/accessibility, logic/security and TypeScript checks passed;
- Supabase Edge Function typecheck and contextual-engine behavioural tests passed.

## Runtime gates passed on the exact APK

### Android 15 / API 35

- clean uninstall/install: passed;
- first cold launch: passed;
- expected signed-out Cogni welcome UI rendered: passed;
- process remained alive, foreground and top-resumed after 60 seconds: passed;
- second forced cold launch: passed;
- process remained alive after a further 30 seconds: passed;
- no fatal Java/Kotlin, React Native or native signal crash detected: passed.

### Android 16 / API 36

- clean uninstall/install: passed;
- first cold launch: passed;
- expected signed-out Cogni welcome UI rendered: passed;
- process remained alive, foreground and top-resumed after 60 seconds: passed;
- second forced cold launch: passed;
- process remained alive after a further 30 seconds: passed;
- no fatal Java/Kotlin, React Native or native signal crash detected: passed.

## Remaining boundary

Automated tests prove that this exact signed APK installs and starts correctly on clean Android 15 and Android 16 environments. They cannot reproduce every Samsung firmware, hardware or previously restored device-state condition. A clean install on the user's Samsung remains the final physical-device confirmation before broader release testing.
