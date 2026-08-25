import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const requireText = (source, needle, message) => { if (!source.includes(needle)) failures.push(message); };
const forbidText = (source, needle, message) => { if (source.includes(needle)) failures.push(message); };

const layout = read("app/_layout.tsx");
requireText(layout, 'initialRouteName: "index"', "Welcome must remain the root launch anchor.");
requireText(layout, '<Stack.Protected guard={!signedIn}>', "Signed-out routes must use an explicit protected group.");
requireText(layout, '<Stack.Protected guard={signedIn}>', "Signed-in routes must use an explicit protected group.");
requireText(layout, '<Stack.Screen name="(tabs)"', "Signed-in learners must fall back to the product tabs.");
requireText(layout, '<Stack.Screen name="auth/recovery"', "Password recovery/change must retain a globally resolvable route.");

const forgot = read("app/forgot-password.tsx");
requireText(forgot, 'setError("Enter your email address first.")', "An empty recovery submission must provide visible validation.");
requireText(forgot, 'emailRef.current?.focus()', "An empty recovery submission must focus the missing email field.");
requireText(forgot, 'disabled={busy}', "The recovery action must remain pressable when the form is empty.");
forbidText(forgot, 'disabled={busy || !email.trim()}', "The recovery action must not silently disable itself for an empty email.");
requireText(forgot, 'router.replace("/login")', "Back to sign in must replace the reset route deterministically.");
requireText(forgot, 'label="Back to sign in"', "Password reset must expose a full sign-in return action.");

const profile = read("app/(tabs)/profile.tsx");
requireText(profile, 'label="Change password"', "Signed-in account settings must expose a working password-change action.");
requireText(profile, 'pathname: "/auth/recovery"', "Signed-in password change must navigate to the authenticated recovery form.");
requireText(profile, 'source: "profile"', "Password change must identify its profile origin for correct copy and return navigation.");
forbidText(profile, 'router.push("/forgot-password")', "A signed-in learner must never be sent to the signed-out reset-email route.");

const recovery = read("app/auth/recovery.tsx");
requireText(recovery, "useLocalSearchParams", "The recovery form must distinguish profile password changes from email recovery links.");
requireText(recovery, 'source === "profile"', "The recovery form must recognise profile-origin password changes.");
requireText(recovery, 'Change your password', "Profile-origin password change must use accurate copy.");
requireText(recovery, 'label="Back to profile"', "Profile-origin password change must provide a working return action.");
requireText(recovery, 'setError("Use at least 8 characters.")', "Invalid short passwords must produce visible validation rather than an inert button.");
requireText(recovery, 'setError("Passwords do not match.")', "Mismatched passwords must produce visible validation.");
requireText(recovery, 'disabled={busy}', "Save new password must remain pressable for form validation when not busy.");
forbidText(recovery, 'disabled={busy || password.length < 8 || password !== confirm}', "Password validation must not rely on a silently disabled action.");

if (failures.length) {
  console.error("Cogni authentication-route audit failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Cogni authentication-route audit passed.");
console.log("✓ Welcome is the deterministic launch fallback");
console.log("✓ Password-reset controls always respond with navigation or validation");
console.log("✓ Signed-in password change uses the authenticated route");
console.log("✓ Recovery and profile return paths are explicit");
