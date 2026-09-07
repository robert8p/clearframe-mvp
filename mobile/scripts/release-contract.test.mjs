import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
const read = (name) => fs.readFileSync(new URL(name, import.meta.url), "utf8");
test("0.4.4 preview retains application and EAS identity", () => {
  const { expo } = JSON.parse(read("../app.json"));
  assert.equal(expo.version, "0.4.4");
  assert.equal(expo.android.package, "app.gocogni.cogni");
  assert.equal(expo.ios.bundleIdentifier, "app.gocogni.cogni");
  assert.equal(expo.extra.eas.projectId, "24fc0fea-5e66-4365-a82c-ac668aded7d0");
});
test("onboarding and feedback E2E expectations match displayed copy", () => {
  for (const [screen, suite, label] of [
    ["../app/onboarding.tsx", "../../.github/scripts/cogni-signup-onboarding-e2e.py", "Which situations matter to you?"],
    ["../app/(tabs)/profile.tsx", "../../.github/scripts/cogni-monetization-prestore-e2e.py", "Short sounds mark answer results and session completion."],
  ]) { assert(read(screen).includes(label)); assert(read(suite).includes(label)); }
});
test("feedback preview respects preference readiness and mute controls", () => {
  const profile = read("../app/(tabs)/profile.tsx");
  assert(profile.includes('label="Preview feedback"'));
  assert(profile.includes('disabled={!feedbackReady || (!soundEnabled && !hapticsEnabled)}'));
  assert(profile.includes('onPress={() => playFeedback("complete")}'));
  assert(profile.includes('appConfig.expo.version'));
});
