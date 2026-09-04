# Cogni copy, Train navigation and learning feedback

## Display copy

- API display payloads are normalised before rendering or caching.
- Literal escaped line breaks, carriage returns and tabs are converted into real display whitespace.
- The six affected casual-learning prompts are corrected in the production content database.
- A database constraint prevents literal escaped control sequences from returning in challenge display fields.
- Sounds never carry information that is absent from visible or accessibility text.

## Train navigation

Train is one of five top-level destinations. It therefore follows the same navigation-bar geometry, label baseline, touch target and selected-state treatment as Home, Skills, Progress and Profile.

The former raised media-play control has been removed. Train now uses a compact practice-target symbol inside the same selected pill used by every active destination. It does not float over content and is not presented as a global action button.

## Learning feedback

- Answer selection is haptic-only to avoid repetitive tap sounds.
- Correct, review and completion outcomes use brief, low-volume tones.
- Sounds respect silent mode, mix with other audio and stop when the app leaves the foreground.
- Android uses semantic platform haptics; iOS uses semantic selection and notification feedback.
- Sound effects and haptic feedback can be disabled independently in Profile.
- Preferences persist across app launches.
- Audio is playback-only. Microphone permission is explicitly disabled and blocked.
- Direct audio players are released when the feedback provider is removed.

## Release evidence

The exact Android release gate must confirm:

1. `android.permission.RECORD_AUDIO` is absent from the signed APK;
2. the five navigation destinations are aligned and ordered correctly;
3. visible Training copy contains no literal escaped control sequences;
4. Sound effects and Haptic feedback switches operate and retain their original state after testing;
5. feedback interactions do not cause an Android or React Native crash.
