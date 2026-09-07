# Cogni 0.4.3 build 61 — completed verification

7 September 2026. The final signed Android APK passed the source, build, installed interaction and visual review gates. This report records completed work; the release publication workflow verifies these exact bytes before making the existing draft downloadable.

## Exact release identity

| Item | Verified value |
|---|---|
| Android version / versionCode | 0.4.3 / 61 |
| Release tag | `v0.4.3-preview.2` |
| Compiled commit | `155aa5be400412a043dfb37947bb6ff1f24da4fd` |
| APK SHA-256 | `2fc4cb666900b8e4d5dc01f5dd9e292cc5552dfec242cec17ed30b68e4253ef2` |
| Android application ID | `app.gocogni.cogni` |
| Signing certificate SHA-256 | `e0bfda379dfa0e11aee798e443ce3b33d006d83b7857062f8f639ca7f7572c7e` |
| Successful build/test workflow | [34125663682, attempt 2](https://github.com/robert8p/clearframe-mvp/actions/runs/34125663682) |
| Exact APK artifact | `10020438899`, `cogni-0.4.3-exact-apk-1` |
| Passing runtime evidence | `10021903723`, `cogni-0.4.3-runtime-api-36-2` |
| Runtime archive SHA-256 | `1a05e287d83ba614559a6ee020e7bb27336a5da913c90a316bbf0de49b330100` |

The final publication commit adds only release documentation and the publication workflow. It does not change the compiled application, backend or tested APK. The build uses explicit EAS profile overrides for build numbering, cache and public configuration; application and server implementation are taken from the recorded commit.

## Implemented stakeholder outcomes

The review continued from the verified 0.4.1 baseline, preserved the already-implemented 0.4.2 redesign, and delivered these additional changes:

- Learners explicitly choose confidence when requested; unrequested confidence is omitted. Submitted explanations move into view, accessible selection and ranking instructions improve, and completion/resume states reflect saved work.
- Lessons support reflecting without typing, keep reflection text local, and report failed relevance feedback honestly.
- Progress history exposes every measured skill, actual recorded dates, chart/list presentation, date paging and an expandable score explanation. Zero scores, one-day history, missing dates and duplicate observations are handled without inventing data.
- Profile, password, support and preview-subscription screens have clearer status, action-specific busy states and explicit success or failure feedback. Password changes retain a visible confirmation before returning to Profile.
- Entitlement requests and native billing actions are scoped to the active account. Purchase is blocked unless authoritative configuration and a matching store offering are available; restoration remains independently guarded. Paid billing stays disabled in this preview.
- Android text reflows correctly when system font size changes during use. The native cache correction is narrowly pinned to Expo 54 / React Native 0.81.5 and guarded at startup.

This is an expert review through stakeholder perspectives, not interviews, clinical validation or legal certification. The full findings and implementation decisions are in `COGNI_0.4.3_STAKEHOLDER_REVIEW.md`.

## Completed checks

| Gate | Observed result |
|---|---|
| Mobile behaviour/regression tests | 95 passed, including progress edge cases, confidence payloads, account changes, entitlement races and the native font plugin |
| Server tests | 28 passed |
| Expo dependency health | 18/18 checks passed; duplicate Expo Constants versions resolved |
| Signed native build | Kotlin and release compilation passed; package identity, signing certificate, expected permissions, 16 KB ZIP alignment and secret scan passed |
| In-place Android upgrade | Verified 0.4.2 build 57 installed, signed in and restarted with sound/haptics disabled; `adb install -r` of this exact build 61 preserved account/session, both preferences, app ID 10216 and first-install timestamp |
| Native cold starts | Two exact-APK launch checks passed; logs reached React Native main without fatal startup, JavaScript exception or font-flag guard errors |
| Installed Android API 36 interactions | Authentication, Home/Skills/Train/Progress/Profile routing, skill search/filters, answer selection, explicit confidence, feedback, saved progress/resume and preference persistence passed |
| Password change | Updated a disposable account's password; old password rejected, new password accepted through sign-in; original credential restored |
| Account lifecycle / preview billing | Signup, onboarding, deletion, disabled-billing messaging and safe exit passed |
| Test cleanup | Disposable test-account cleanup passed; no recovery email sent to an invented real inbox |
| Website / iOS JavaScript | Production web compilation and iOS JavaScript export passed; web lint retained 22 existing warnings and no errors |

The installed upgrade test covers 0.4.2 to 0.4.3. Separate source inspection found the 0.4.1 SecureStore/session and feedback-preference persistence formats unchanged through this release, with the same application identity and signing certificate. A direct installed 0.4.1-to-0.4.3 test was not run.

The first runtime attempt failed before build 61 was installed: Android input automation truncated the disposable sign-in email in the old 0.4.2 baseline. Cleanup succeeded. Retrying the failed job used the same compiled APK bytes and passed every runtime gate; no application change or substitute APK was used.

## Completed visual review

The final runtime archive was downloaded, its digest verified, and native screenshots directly inspected. Home text and the primary training action are readable at a live 160% font change and a cold launch at 160%, and return to the original layout at 100%.

| Primary action measurement | Width × height, device pixels |
|---|---|
| Original 100% | 832 × 154 |
| Live change to 160% | 832 × 239 |
| Cold launch at 160% | 832 × 239 |
| Return to 100% | 832 × 154 |

The live/cold dimensions match exactly. Visible text wraps within the button, and Home headings, body text, decorative wordmark and navigation remain readable. Independent review also accepted the final large-text Progress/Skills summaries, skill search and filters, submitted-answer feedback and password-success confirmation. The captured Progress screenshot covers its summary; the lower history chart/list behaviour is established by component tests rather than that screenshot.

Intermediate build 60 is not the delivered APK. Although its earlier automated checks passed, direct screenshot review found stale live font measurements. Its preview remains a draft; build 61 fixes the native cause and adds the dimension comparison that catches the earlier failure.

## Remaining limits and non-blocking observations

This is an installable Android preview. A signed iPhone/TestFlight build, real store purchases/restores/renewals, physical sound/haptic quality, physical TalkBack/VoiceOver traversal and recovery-email delivery/redemption have not been verified. The iOS result is a JavaScript export, not a native iPhone test.

Cogni provides curated thinking practice. Arbitrary-topic live AI-generated learning, measured learning transfer, retention and paid conversion are not established by this release. Legal/contact ownership and store disclosures still need owner confirmation; authenticated website end-to-end testing and broad content adjudication remain separate work.

Two non-blocking singular-count copy issues remain in summary labels: “1 measured skills” and “1 observations”. The font-cache workaround must be reviewed on the next Expo/React Native upgrade; its version and startup guards intentionally fail on unsupported configurations. Changing font size remounts screen scroll content, which can reset child scroll/focus while retaining parent learning/form state.

To install, download `Cogni-0.4.3-preview.apk` on Android, open it and choose **Update**. Keep the existing installation to preserve its local settings. Version 0.4.3 appears in Profile and on the welcome screen.
