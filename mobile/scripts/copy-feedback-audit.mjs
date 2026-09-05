import fs from "node:fs";
import path from "node:path";

const mobileRoot = process.cwd();
const repoRoot = path.resolve(mobileRoot, "..");
const failures = [];
const readMobile = (relative) => fs.readFileSync(path.join(mobileRoot, relative), "utf8");
const readRepo = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const requireText = (source, needle, message) => { if (!source.includes(needle)) failures.push(message); };
const forbidText = (source, needle, message) => { if (source.includes(needle)) failures.push(message); };

const packageJson = JSON.parse(readMobile("package.json"));
for (const [dependency, expected] of Object.entries({
  "expo-asset": "~12.0.13",
  "expo-audio": "~1.1.1",
  "expo-file-system": "~19.0.24",
  "expo-haptics": "~15.0.8",
})) {
  if (packageJson.dependencies?.[dependency] !== expected) {
    failures.push(`${dependency} must use the Expo SDK 54-compatible version ${expected}.`);
  }
}

const packageLock = JSON.parse(readMobile("package-lock.json"));
const lockedPackages = packageLock.packages ?? {};
for (const dependency of ["node_modules/expo-asset", "node_modules/expo-audio", "node_modules/expo-file-system", "node_modules/expo-haptics"]) {
  if (!lockedPackages[dependency]) failures.push(`package-lock.json is missing ${dependency}.`);
}
if (lockedPackages["node_modules/expo-asset"]?.version !== "12.0.13") {
  failures.push(`Top-level expo-asset must be 12.0.13 for Expo SDK 54; found ${lockedPackages["node_modules/expo-asset"]?.version ?? "missing"}.`);
}
if (!String(lockedPackages["node_modules/expo-modules-core"]?.version ?? "").startsWith("3.0.")) {
  failures.push(`expo-modules-core must remain on the Expo SDK 54 3.0.x ABI; found ${lockedPackages["node_modules/expo-modules-core"]?.version ?? "missing"}.`);
}
for (const [packagePath, metadata] of Object.entries(lockedPackages)) {
  if (packagePath.includes("node_modules/expo-asset") && String(metadata?.version ?? "").startsWith("57.")) {
    failures.push(`Cross-SDK expo-asset ${metadata.version} is forbidden at ${packagePath}; it crashes against Expo SDK 54 native modules.`);
  }
}

const appConfig = JSON.parse(readMobile("app.json"));
const audioPlugin = (appConfig.expo?.plugins ?? []).find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-audio");
if (!audioPlugin || audioPlugin[1]?.microphonePermission !== false || audioPlugin[1]?.recordAudioAndroid !== false) {
  failures.push("expo-audio must remain playback-only with iOS and Android recording permissions disabled.");
}
if (audioPlugin?.[1]?.enableBackgroundPlayback !== false || audioPlugin?.[1]?.enableBackgroundRecording !== false) {
  failures.push("Learning feedback must not enable background playback or background recording.");
}
const blockedPermissions = appConfig.expo?.android?.blockedPermissions ?? [];
for (const permission of [
  "android.permission.RECORD_AUDIO",
  "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  "android.permission.POST_NOTIFICATIONS",
]) {
  if (!blockedPermissions.includes(permission)) failures.push(`${permission} must remain explicitly blocked.`);
}

const copy = readMobile("lib/copy.ts");
for (const [needle, message] of [
  [".replace(literalCrLf", "Display-copy repair must decode escaped CRLF."],
  [".replace(literalLineBreak", "Display-copy repair must decode escaped line breaks."],
  [".replace(literalTab", "Display-copy repair must decode escaped tabs."],
  [".replace(/\\n{3,}/g", "Display-copy repair must cap excessive blank lines."],
  ["export function cleanDisplayPayload", "API payload repair must remain recursive for JSON display data."],
]) requireText(copy, needle, message);

const api = readMobile("lib/api.ts");
requireText(api, 'import { cleanDisplayPayload } from "@/lib/copy"', "The mobile API must use the display-copy safety net.");
requireText(api, "const payload = cleanDisplayPayload(result.payload as T)", "Successful API responses must be cleaned before rendering or caching.");
requireText(api, "cleanDisplayPayload(parsed.data)", "Cached display data must also be cleaned.");

const migration = readRepo("supabase/migrations/20260904010500_polish_training_copy.sql");
for (const contentKey of [
  "diag_casual_ai",
  "diag_casual_assumption",
  "diag_casual_cause",
  "diag_casual_evidence",
  "diag_casual_uncertainty",
  "v020_casual_capstone_safe_verification",
]) requireText(migration, contentKey, `Copy migration is missing ${contentKey}.`);
requireText(migration, "The linked regulator page does not support the claim", "The visible investment prompt must use clear, accurate wording.");
requireText(migration, "challenges_display_copy_no_literal_control_escapes", "The database must reject future literal escaped controls in challenge display copy.");

const feedback = readMobile("lib/feedback.tsx");
for (const [needle, message] of [
  ['playsInSilentMode: false', "Learning sounds must respect silent mode."],
  ['shouldPlayInBackground: false', "Learning sounds must not continue in the background."],
  ['interruptionMode: "mixWithOthers"', "Short learning sounds must not seize exclusive audio focus."],
  ["SecureStore.getItemAsync(SOUND_KEY)", "The sound preference must persist securely."],
  ["SecureStore.getItemAsync(HAPTICS_KEY)", "The haptic preference must persist securely."],
  ["player.release()", "Direct audio players must be released on provider cleanup."],
  ["soundEnabledRef.current && isSoundCue(cue)", "Selection must remain haptic-only rather than producing repetitive tap sounds."],
  ["Haptics.performAndroidHapticsAsync", "Android should use the platform haptics engine."],
  ["Haptics.selectionAsync()", "iOS selection feedback must use the semantic selection haptic."],
]) requireText(feedback, needle, message);
const toneBlock = feedback.slice(feedback.indexOf("const TONES"), feedback.indexOf("const FeedbackContext"));
forbidText(toneBlock, "selection:", "Selection should not have an audible tone.");

const rootLayout = readMobile("app/_layout.tsx");
requireText(rootLayout, "<FeedbackProvider>", "The feedback provider must wrap the routed app.");

const runner = readMobile("components/question-runner.tsx");
for (const [needle, message] of [
  ["const { playFeedback } = useFeedback()", "QuestionRunner must consume semantic feedback cues."],
  ['playFeedback(result.correct ? "correct"', "Answer results must trigger outcome feedback."],
  ['playFeedback("selection")', "Answer choices must trigger selection haptics."],
  ['playFeedback("complete")', "Session completion must trigger a distinct completion cue."],
  ["resultCueChallengeRef", "Answer feedback must be deduplicated per challenge."],
  ["AccessibilityInfo.announceForAccessibility", "Audio must supplement rather than replace visible and spoken feedback."],
]) requireText(runner, needle, message);

const profile = readMobile("app/(tabs)/profile.tsx");
for (const [needle, message] of [
  ['title="Sound effects"', "Profile must expose a sound-effects preference."],
  ['title="Haptic feedback"', "Profile must expose a haptic-feedback preference."],
  ["Sounds respect silent mode", "Profile must explain silent-mode behaviour."],
  ["disabled={!feedbackReady}", "Feedback settings must wait for their persisted values."],
]) requireText(profile, needle, message);

const tabs = readMobile("app/(tabs)/_layout.tsx");
requireText(tabs, "tabBarItemStyle: { flex: 1", "Five primary navigation destinations must retain equal width.");
requireText(tabs, 'tabBarAccessibilityLabel: "Train tab"', "Train must have an explicit accessible destination label.");
requireText(tabs, '<TabIcon name="train" active={focused} />', "Train must use the same selected-destination component as its peer tabs.");
forbidText(tabs, "emphasis", "Train must not receive one-off floating-action-button emphasis.");
forbidText(tabs, "marginTop: -", "No tab destination may float outside the navigation bar.");
forbidText(tabs, "width: 62", "Train must not use the old oversized floating control.");
forbidText(tabs, "tabBarButton", "Train must remain navigation rather than a custom action button.");

if (failures.length) {
  console.error("Cogni copy, navigation and feedback audit failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Cogni copy, navigation and feedback audit passed.");
console.log("✓ Expo SDK 54 native modules remain on one compatible ABI");
console.log("✓ Escaped display controls repaired at source and at the API boundary");
console.log("✓ Six affected learning prompts rewritten and protected by a database constraint");
console.log("✓ Train is an equal, clearly selected top-level destination rather than a floating action");
console.log("✓ Outcome sounds are brief, optional, silent-mode aware and non-blocking");
console.log("✓ Selection feedback is haptic-only and all feedback can be disabled independently");
console.log("✓ Audio is playback-only, background audio is disabled and direct players are released correctly");
