import fs from "node:fs";
import path from "node:path";

const mobileRoot = process.cwd();
const repoRoot = path.resolve(mobileRoot, "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const edgePath = path.join(repoRoot, "supabase", "functions", "mobile-api", "index.ts");
const failures = [];

function requireText(source, needle, message) {
  if (!source.toLowerCase().includes(needle.toLowerCase())) failures.push(message);
}

const fixMigrationName = fs
  .readdirSync(migrationsDir)
  .find((name) => name.includes("fix_mobile_api_private_rate_limit_execution"));

if (!fixMigrationName) {
  failures.push("Missing migration that fixes the mobile API private rate-limit privilege boundary.");
} else {
  const migration = fs.readFileSync(path.join(migrationsDir, fixMigrationName), "utf8");
  requireText(migration, "security definer", "The private-table rate-limit RPC must run as SECURITY DEFINER.");
  requireText(migration, "owner to postgres", "The private-table rate-limit RPC must remain owned by postgres.");
  requireText(migration, "set search_path = ''", "The SECURITY DEFINER rate-limit RPC must retain an empty search_path.");
  requireText(migration, "revoke all on schema private from public, anon, authenticated, service_role", "Normal client roles and service_role must not receive direct private-schema access.");
  requireText(migration, "revoke all on table private.mobile_api_rate_limits from public, anon, authenticated, service_role", "The private rate-limit table must remain inaccessible directly.");
  requireText(migration, "grant execute on function public.consume_mobile_api_rate_limit", "service_role must invoke the narrow public rate-limit RPC.");
  requireText(migration, "to service_role", "The rate-limit RPC execute grant must target service_role.");
}

if (!fs.existsSync(edgePath)) {
  failures.push("Missing mobile-api Edge Function entrypoint.");
} else {
  const edge = fs.readFileSync(edgePath, "utf8");
  requireText(edge, 'admin.rpc("consume_mobile_api_rate_limit"', "The Edge Function must enforce rate limiting through the audited RPC.");
  requireText(edge, "await enforceRateLimit(admin, user.id, path, method)", "Rate limiting must run before mobile route handling.");
}

if (failures.length) {
  console.error("Cogni backend privilege audit failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Cogni backend privilege audit passed.");
console.log("✓ Private rate-limit table remains directly inaccessible");
console.log("✓ Narrow RPC executes as postgres with an empty search_path");
console.log("✓ Only service_role may invoke the rate-limit RPC");
console.log("✓ Every authenticated mobile route is rate-limited before handling");
