# Cogni 0.4.1 — Android test preview

## Install and test
Install `Cogni-0.4.1-preview.apk` over your existing Cogni installation. Do not uninstall first: the same package and signing certificate are retained. Sign in with your existing Cogni account.

From Home, use the main training button. It takes you directly to your next activity. Submit an answer, read the explanation, then continue. Leaving and returning should resume at your next unanswered question.

In Profile, find **Sound and touch**. **Preview feedback** lets you try your settings. Sound and haptic feedback can be switched off separately; both settings persist after closing and reopening the app. The preview is disabled when both are off. Version **0.4.1** is visible in Profile and on the signed-out welcome screen.

## Included product changes from the last stable release
- Clear primary training action shared by Home and Train, with meaningful begin/continue labels, accessible states and aligned bottom navigation.
- User-facing copy and escaped-newline repairs across native and web screens.
- Repaired WAV generation, non-blocking short outcome cues, cancellation on mute/background, ordered settings persistence, and screen-reader priority.
- Duplicate answer/next-press protection and clearer empty/error states.
- Narrow-screen and large-text layout handling.

## Safety and test boundaries
This is a test preview, not a paid launch. Production monetisation remains disabled. The signed APK deliberately has no RevenueCat store SDK keys, so purchasing and restoring store purchases are unavailable. Server-side premium enforcement and webhook security remain unchanged.

Automated checks cover source tests, native launch/authentication, onboarding, tabs, account lifecycle, preference persistence, question submission/resume and the disabled pre-store paywall. Signed-build metadata and runtime evidence must be examined before calling this release verified. An emulator cannot establish physical sound quality. Apple/TestFlight and Google Play billing validation are separate outstanding release tasks.
