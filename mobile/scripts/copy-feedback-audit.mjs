import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const fail = (message) => {
  console.error(`COPY/FEEDBACK AUDIT FAILED: ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const packageJson = JSON.parse(read("package.json"));
const appJson = JSON.parse(read("app.json"));
const tabs = read("app/(tabs)/_layout.tsx");
const rootLayout = read("app/_layout.tsx");
const api = read("lib/api.ts");
const copy = read("lib/copy.ts");
const feedback = read("lib/feedback.tsx");
const runner = read("components/question-runner.tsx");
const profile = read("app/(tabs)/profile.tsx");

assert(packageJson.dependencies?.["expo-audio"] === "~1.1.1", "Expo SDK 54 must use expo-audio ~1.1.1.");
assert(packageJson.dependencies?.["expo-file-system"] === "~19.0.24", "Expo SDK 54 must use expo-file-system ~19.0.24.");
assert(packageJson.dependencies?.["expo-haptics"] === "~15.0.8", "Expo SDK 54 must use expo-haptics ~15.0.8.");

const audioPlugin = appJson.expo?.plugins?.find((entry) => Array.isArray(entry) && entry[0] === "expo-audio");
assert(Boolean(audioPlugin), "app.json must explicitly configure expo-audio.");
assert(audioPlugin?.[1]?.microphonePermission === false, "iOS microphone permission must be disabled for playback-only feedback.");
assert(audioPlugin?.[1]?.recordAudioAndroid === false, "Android audio recording must be disabled for playback-only feedback.");
assert(appJson.expo?.android?.blockedPermissions?.includes("android.permission.RECORD_AUDIO"), "Android RECORD_AUDIO must be explicitly blocked.");

assert(rootLayout.includes("<FeedbackProvider>"), "The app root must provide feedback preferences and lifecycle management.");
assert(api.includes("cleanDisplayPayload(result.payload as T)"), "Every successful API response must be cleaned before rendering.");
assert(copy.includes("literalLineBreak") && copy.includes("cleanDisplayPayload"), "The copy normaliser must repair escaped controls recursively.");

assert(feedback.includes('playsInSilentMode: false'), "Sound effects must respect silent mode.");
assert(feedback.includes('interruptionMode: "mixWithOthers"'), "Short UI sounds must not interrupt other audio.");
assert(feedback.includes('shouldPlayInBackground: false'), "Learning feedback must stop in the background.");
assert(feedback.includes("performAndroidHapticsAsync"), "Android must use the native haptics API.");
assert(feedback.includes("SecureStore.setItemAsync"), "Feedback preferences must persist securely.");
assert(feedback.includes("player.remove()"), "Manually created audio players must be released.");

assert(runner.includes('playFeedback("selection")'), "Question choices must provide optional selection feedback.");
assert(runner.includes('playFeedback(result.correct ? "correct"'), "Answer results must provide semantic feedback.");
assert(runner.includes('playFeedback("complete")'), "Session completion must provide a restrained completion cue.");
assert(runner.includes("AccessibilityInfo.announceForAccessibility"), "Sounds must supplement, not replace, accessible result text.");
assert(profile.includes('title="Sound effects"') && profile.includes('title="Haptic feedback"'), "Profile must expose separate sound and haptic controls.");

assert(!tabs.includes("emphasis"), "Train must not be treated as a floating or primary action.");
assert(!tabs.includes("tabBarButton"), "Train must remain a normal navigation destination, not a custom action button.");
assert(!tabs.includes('tabBarLabelStyle: { color: colors.cyan'), "Train must not receive a permanently special label style.");
assert(tabs.includes('tabBarItemStyle: { flex: 1'), "All five destinations must receive equal tab-bar width.");
assert(tabs.includes('title: "Train"') && tabs.includes('tabBarAccessibilityLabel: "Train tab"'), "Train must retain a visible label and explicit accessibility name.");

function filesUnder(relative) {
  const directory = path.join(root, relative);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relative, entry.name);
    return entry.isDirectory() ? filesUnder(child) : child;
  });
}

for (const relative of [...filesUnder("app"), ...filesUnder("components")]) {
  if (!/\.[jt]sx?$/.test(relative)) continue;
  const source = read(relative);
  if (source.includes("\\n\\n")) fail(`${relative} contains a literal escaped blank line in screen copy.`);
  if (source.includes("\\r\\n")) fail(`${relative} contains a literal escaped CRLF in screen copy.`);
  if (source.includes("\\t") && !source.includes("replace(/\\t")) fail(`${relative} contains a literal escaped tab in screen copy.`);
}

if (!process.exitCode) console.log("Copy, equal-weight Train navigation, playback-only audio and optional haptic feedback checks passed.");
