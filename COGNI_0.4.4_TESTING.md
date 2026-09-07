# Cogni 0.4.4 build 63 — Android preview testing guide

## Install without losing your account

[Open the completed Expo build](https://expo.dev/accounts/cogniapp/projects/cogni/builds/75cb1db3-3c31-4236-9d19-3d6a82fb6e1f).

[Download the Android APK from Expo](https://expo.dev/artifacts/eas/wa9VtnIxV6A2AavEjVI0AjXX6HF--BOWTh7Ge4UrnrQ.apk).

Open the downloaded Android APK and choose **Update**. Keep your existing Cogni installation; do not uninstall or clear app data. The in-place upgrade check confirmed the same signed-in account and sound/haptic preferences survived the change from 0.4.3 build 61 to 0.4.4 build 63. This is a standalone Android app distributed through Expo, not an Expo Go project. Version 0.4.4 appears on the welcome screen and at the bottom of Profile.

## Start with the changes that matter

On **Home**, use the main training action to continue your existing activity. After submitting an answer, select **Save key idea**. Return to Home and open **saved ideas**. Try recalling the idea before selecting **Reveal idea**. Close and reopen Cogni to check that it remains saved.

In the toolkit, choose an optional target of **2, 3 or 5 days a week**, or leave **No target** selected. A day counts when an answer is accepted by the learning service. Additional answers on the same date do not add days. The tool starts with this version on this device; it does not reconstruct older online activity. It has no reminder, penalty or premium-access effect.

Try the **real-life reflection prompt** on Home. The prompt rotates by date through twelve thinking lenses; its application context follows your selected audience. It is not a scored assessment or an AI-generated question.

Saved ideas are designed to be reviewed without a connection after they have been saved and you have a persisted sign-in session. New questions and submitted scores still need a connection. **Share idea** opens Android’s share chooser and includes the idea only, not your account or scores. Cancel the chooser to test the action without sending anything.

The welcome screen offers **Try a sample decision**, with three interactive examples and no account requirement. Existing signed-in users do not have to sign out to use any of the other new features. Only test the welcome journey after signing out when you know your sign-in details.

## Privacy and limits

The toolkit stores your latest **12 saved ideas**, a bounded practice-day record and optional target in encrypted device storage, separately for each Cogni account. It does not sync between phones. Saving beyond the limit replaces the oldest idea. Removing an idea or clearing device tools does not delete online answers, scores or learning history. Uninstalling or clearing app data can remove device-local tools.

Paid subscriptions remain disabled in this preview. No iPhone build is included. Physical-device accessibility, sound/haptic quality and real-world learning/retention still need independent evaluation; automated tests are not evidence of commercial success or improved cognitive ability.

## Exact binary

- Version / Android versionCode: **0.4.4 / 63**.
- Compiled application commit: `360c87533e776c6304888ce4e5fbfbb7335debd6`.
- Expo build: `75cb1db3-3c31-4236-9d19-3d6a82fb6e1f`.
- APK SHA-256: `fd389171211ded80358a8f8488dff67065d9cf4e990b65d71b44ffb64acd0407`.

The build-stage metadata deliberately records installed tests as not yet run at that stage. Subsequent installed verification has separate workflow evidence; do not mistake a successful source test for an installed-device test.
