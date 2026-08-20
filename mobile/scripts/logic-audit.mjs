import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const repoRoot = path.resolve(root, "..");
const failures = [];
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const requireText = (source, needle, message) => { if (!source.includes(needle)) failures.push(message); };
const forbidText = (source, needle, message) => { if (source.includes(needle)) failures.push(message); };

const api = read("lib/api.ts");
requireText(api, "/functions/v1/mobile-api", "Mobile networking must use the Supabase mobile-api Edge Function.");
requireText(api, "AbortController", "Mobile networking must enforce a request timeout.");
requireText(api, "refreshSession", "Mobile networking must recover once from an expired access token.");
forbidText(api, "EXPO_PUBLIC_API_URL", "Legacy EXPO_PUBLIC_API_URL must not return.");
forbidText(api, "vercel.app", "Mobile networking must not depend on Vercel.");

const supabase = read("lib/supabase.ts");
requireText(supabase, "process.env.EXPO_PUBLIC_SUPABASE_URL", "Expo public variables must use static dot notation so Metro can inline them.");
requireText(supabase, "process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "The Supabase publishable key must use static Expo environment access.");
forbidText(supabase, "process.env[", "Dynamic process.env access is not supported by Expo and can create an immediate production startup crash.");
forbidText(supabase, "expo-sqlite/localStorage/install", "The startup path must not initialise the retired SQLite/localStorage auth adapter.");
requireText(supabase, "RUNTIME_CONFIGURATION_ERROR", "A malformed build must show a safe configuration screen rather than throw during module initialisation.");
requireText(supabase, "expo-secure-store", "Auth sessions must use secure device storage when it is available.");
requireText(supabase, "SecureStore.isAvailableAsync", "Secure auth storage must verify native SecureStore availability before use.");
requireText(supabase, "disableSecureStore", "Device-specific SecureStore failures must degrade safely rather than crash startup.");
requireText(supabase, "memoryStorage", "A native storage failure must retain a non-crashing in-memory session fallback.");
forbidText(supabase, '?? "https://', "Supabase configuration must never silently fall back to the production project.");

const appConfig = JSON.parse(read("app.json"));
if (appConfig.expo?.android?.allowBackup !== false) failures.push("Android app-data backup must remain disabled so undecryptable SecureStore state cannot be restored after reinstall/device transfer.");
const plugins = JSON.stringify(appConfig.expo?.plugins ?? []);
if (!plugins.includes("expo-secure-store") || !plugins.includes("configureAndroidBackup")) failures.push("Expo SecureStore must be configured explicitly in app.json for Android backup exclusions.");

const rootLayout = read("app/_layout.tsx");
requireText(rootLayout, "StartupErrorBoundary", "The app root must retain a visible startup/render error boundary.");
requireText(rootLayout, "RUNTIME_CONFIGURATION_ERROR", "The app root must intercept malformed runtime configuration without crashing.");
requireText(rootLayout, "StartupConfigurationScreen", "Malformed builds must render an explicit configuration failure screen.");
const startupBoundaryPath = path.join(root, "components/startup-error-boundary.tsx");
if (!fs.existsSync(startupBoundaryPath)) failures.push("Missing native startup error boundary component.");
else {
  const startupBoundary = fs.readFileSync(startupBoundaryPath, "utf8");
  requireText(startupBoundary, "componentDidCatch", "Startup error boundary must record render failures for diagnosis.");
  requireText(startupBoundary, "minHeight: 56", "Startup recovery action must retain an accessible touch target.");
}
const startupConfigurationPath = path.join(root, "components/startup-configuration-screen.tsx");
if (!fs.existsSync(startupConfigurationPath)) failures.push("Missing non-crashing build configuration screen.");

const onboarding = read("app/onboarding.tsx");
requireText(onboarding, "OptionPicker", "Onboarding must use canonical context choices.");
requireText(onboarding, "functionOptionsForAudience", "Onboarding must connect profile choices to canonical content tags.");

const profile = read("app/(tabs)/profile.tsx");
requireText(profile, "/api/mobile/account", "Profile must expose server-side account deletion.");
requireText(profile, "OptionPicker", "Profile personalisation must use canonical context choices.");

const runner = read("components/question-runner.tsx");
requireText(runner, "requiredSelections", "Multi-select questions must enforce authored selection counts.");
requireText(runner, "multi.length === requiredSelections", "Multi-select submission must wait for the exact required count.");

for (const relative of ["app/forgot-password.tsx", "app/auth/confirm.tsx", "app/auth/recovery.tsx"]) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing native auth route ${relative}.`);
}

for (const relative of ["supabase/functions/mobile-api/index.ts", "supabase/functions/mobile-api/engine.ts"]) {
  if (!fs.existsSync(path.join(repoRoot, relative))) failures.push(`Missing Supabase mobile backend file ${relative}.`);
}

const migrationDir = path.join(repoRoot, "supabase/migrations");
const hardeningMigration = fs.readdirSync(migrationDir).find((name) => name.includes("mobile_security_and_atomic_scoring_hardening"));
if (!hardeningMigration) failures.push("Missing database security/scoring hardening migration.");
else {
  const migration = fs.readFileSync(path.join(migrationDir, hardeningMigration), "utf8");
  requireText(migration, "revoke insert, update, delete on table public.profiles from authenticated", "Authenticated clients must not be able to self-edit admin/XP profile columns.");
  requireText(migration, "record_scored_answer", "Scoring must use one transactional database function.");
  requireText(migration, "pg_advisory_xact_lock", "Scoring must serialize concurrent writes for one user.");
  requireText(migration, "evidence_points", "Repeated questions must not count as full independent evidence.");
}

const metricsPath = path.join(repoRoot, "scripts/internal_alpha_metrics.sql");
if (!fs.existsSync(metricsPath)) failures.push("Missing read-only internal-alpha product metrics query pack.");
else {
  const metrics = fs.readFileSync(metricsPath, "utf8");
  requireText(metrics, "signup_to_activation_pct", "Alpha metrics must retain sign-up to activation measurement.");
  requireText(metrics, "d1_retention_pct", "Alpha metrics must retain D1 learning retention.");
  requireText(metrics, "d3_retention_pct", "Alpha metrics must retain D3 learning retention.");
  requireText(metrics, "d7_retention_pct", "Alpha metrics must retain D7 learning retention.");
  requireText(metrics, "median_active_answer_span_minutes", "Session effort must use active answer span rather than wall-clock session age.");
  requireText(metrics, "training_sessions", "Activation and completion must remain grounded in authoritative training-session records.");
  requireText(metrics, "user_responses", "Retention must remain grounded in server-validated scored responses.");
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".expo") return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(root).filter((file) => /\.(ts|tsx)$/.test(file))) {
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("vercel.app")) failures.push(`${path.relative(root, file)} still references Vercel.`);
  if (source.includes("EXPO_PUBLIC_API_URL")) failures.push(`${path.relative(root, file)} still references the retired API URL setting.`);
}

if (failures.length) {
  console.error("Cogni logic/security audit failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Cogni logic/security audit passed.");
console.log("✓ Supabase Edge backend only");
console.log("✓ Expo public configuration is statically inlined");
console.log("✓ Crash-safe secure auth persistence without SQLite startup coupling");
console.log("✓ Visible root startup and configuration recovery");
console.log("✓ Canonical context personalisation");
console.log("✓ Exact multi-select requirements");
console.log("✓ Native recovery + account deletion");
console.log("✓ Transactional scoring + reduced repeat evidence");
console.log("✓ Authoritative alpha activation/retention metrics");
console.log("✓ No Vercel dependency in mobile source");
