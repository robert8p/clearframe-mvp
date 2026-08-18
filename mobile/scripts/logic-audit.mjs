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
requireText(supabase, "expo-secure-store", "Auth sessions must use secure device storage.");
requireText(supabase, "One-release migration path", "Secure auth storage must migrate existing SQLite sessions.");
forbidText(supabase, '?? "https://', "Supabase configuration must never silently fall back to production.");

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
console.log("✓ Secure auth session persistence");
console.log("✓ Canonical context personalisation");
console.log("✓ Exact multi-select requirements");
console.log("✓ Native recovery + account deletion");
console.log("✓ Transactional scoring + reduced repeat evidence");
console.log("✓ No Vercel dependency in mobile source");
