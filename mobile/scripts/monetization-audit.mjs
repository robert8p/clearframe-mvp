import fs from "node:fs";
import path from "node:path";

const mobileRoot = process.cwd();
const repoRoot = path.resolve(mobileRoot, "..");
const failures = [];
const readMobile = (relative) => fs.readFileSync(path.join(mobileRoot, relative), "utf8");
const readRepo = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const requireText = (source, needle, message) => { if (!source.includes(needle)) failures.push(message); };
const forbidText = (source, needle, message) => { if (source.includes(needle)) failures.push(message); };

const appConfig = JSON.parse(readMobile("app.json"));
if (appConfig.expo?.version !== "0.4.0") failures.push("Cogni monetisation candidate must remain version 0.4.0.");
if (appConfig.expo?.android?.package !== "app.gocogni.cogni") failures.push("Android application identity changed.");
if (appConfig.expo?.ios?.bundleIdentifier !== "app.gocogni.cogni") failures.push("iOS application identity changed.");
if (!(appConfig.expo?.android?.permissions ?? []).includes("com.android.vending.BILLING")) failures.push("Android billing permission is missing.");

const purchases = readMobile("lib/purchases.ts");
requireText(purchases, "process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY", "Google RevenueCat public key must use static Expo environment access.");
requireText(purchases, "process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY", "Apple RevenueCat public key must use static Expo environment access.");
forbidText(purchases, "process.env[", "Dynamic RevenueCat environment lookup would repeat the production startup regression.");
requireText(purchases, 'const MONTHLY_PRODUCT_ID = "cogni_pro_monthly"', "Monthly product ID must remain exact.");
requireText(purchases, 'const ANNUAL_PRODUCT_ID = "cogni_pro_annual"', "Annual product ID must remain exact.");
requireText(purchases, "if (id === MONTHLY_PRODUCT_ID)", "Only the approved monthly store product may enter the paywall.");
requireText(purchases, "if (id === ANNUAL_PRODUCT_ID)", "Only the approved annual store product may enter the paywall.");
forbidText(purchases, 'identifier.includes("month")', "Package-name heuristics must not admit an unrelated product.");
forbidText(purchases, "Purchases.logOut", "Custom-ID-only RevenueCat mode must not create an anonymous identity on Cogni sign-out.");

const entitlements = readMobile("lib/entitlements.tsx");
requireText(entitlements, 'apiFetch<EntitlementState>("/api/mobile/entitlements")', "The client must load the server entitlement projection.");
requireText(entitlements, 'apiFetch<EntitlementState>("/api/mobile/entitlements/sync"', "Purchases and restores must reconcile through the trusted server.");
requireText(entitlements, "state?.isPro", "Premium UI state must derive from the server response.");
requireText(entitlements, "AppState.addEventListener", "Entitlement state must refresh on foreground.");

const paywall = readMobile("app/paywall.tsx");
for (const required of ["priceString", "Restore purchases", "Not now", "Privacy", "Subscription terms", "renews automatically"]) {
  requireText(paywall, required, `Paywall is missing required store/subscription UX: ${required}`);
}
forbidText(paywall, "£7.99", "Paywall must not hardcode launch price.");
forbidText(paywall, "£39.99", "Paywall must not hardcode annual price.");

const api = readRepo("supabase/functions/mobile-api/index.ts");
const practiceRoute = api.indexOf('path.startsWith("/api/mobile/practice/")');
const practiceGate = api.indexOf('await requirePro(admin, user.id, "focused_practice")', practiceRoute);
const practiceCreate = api.indexOf("getOrCreatePracticeSession", practiceRoute);
if (practiceRoute < 0 || practiceGate < practiceRoute || practiceCreate < practiceGate) failures.push("Focused-practice session creation must be server-gated before work begins.");
const answerMode = api.indexOf('if (mode === "practice") await requirePro(admin, user.id, "focused_practice")');
if (answerMode < 0) failures.push("Practice answer submission must re-check Pro after a session was created.");
const externalDelete = api.indexOf("await deleteRevenueCatCustomer(admin, user.id)");
const authDelete = api.indexOf("await admin.auth.admin.deleteUser(user.id)", externalDelete);
if (externalDelete < 0 || authDelete < externalDelete) failures.push("RevenueCat privacy deletion must complete before the Cogni identity is removed.");

const monetization = readRepo("supabase/functions/mobile-api/monetization.ts");
const reliableCheck = monetization.indexOf("if (!state.stateReliable) throw new BillingUnavailableError()");
const disabledReturn = monetization.indexOf("if (!state.config.monetizationEnabled || !featureRequiresPro) return state", reliableCheck);
if (reliableCheck < 0 || disabledReturn < reliableCheck) failures.push("Protected routes must fail closed when monetisation configuration cannot be verified.");
requireText(monetization, "DELETE", "Account deletion must call the RevenueCat customer deletion API.");
requireText(monetization, "REVENUECAT_SECRET_API_KEY", "RevenueCat server sync/deletion must use a server-only secret.");

const migrationPath = path.join(repoRoot, "supabase/migrations/20260825234024_cogni_monetisation_foundation.sql");
if (!fs.existsSync(migrationPath)) failures.push("Monetisation migration filename must match the production migration ledger.");
else {
  const migration = fs.readFileSync(migrationPath, "utf8");
  for (const [needle, message] of [
    ["enable row level security", "Entitlement tables must retain RLS."],
    ["revoke insert, update, delete", "Authenticated clients must not write entitlement state."],
    ["security definer", "Entitlement sync must remain SECURITY DEFINER."],
    ["set search_path = ''", "Entitlement sync must retain an empty search_path."],
    ["grant execute on function public.sync_subscription_entitlement", "Only the trusted service role may project entitlements."],
    ["on conflict (event_id) do nothing", "Webhook idempotency must remain atomic."],
  ]) requireText(migration.toLowerCase(), needle, message);
}

const webhook = readRepo("supabase/functions/revenuecat-webhook/index.ts");
requireText(webhook, 'req.headers.get("X-RevenueCat-Webhook-Signature")', "Webhook must read RevenueCat's HMAC signature header.");
requireText(webhook, "new Uint8Array(await req.arrayBuffer())", "Webhook HMAC must verify the raw body before JSON parsing.");
requireText(webhook, "verifyRevenueCatSignature", "Webhook must reject invalid HMAC signatures.");
requireText(webhook, "REVENUECAT_WEBHOOK_AUTHORIZATION", "Webhook must support the independent Authorization secret.");

const executableRoots = ["app", "components", "lib"];
for (const root of executableRoots) {
  const stack = [path.join(mobileRoot, root)];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const source = fs.readFileSync(full, "utf8");
        for (const secretName of ["REVENUECAT_SECRET_API_KEY", "REVENUECAT_WEBHOOK_HMAC_SECRET", "REVENUECAT_WEBHOOK_AUTHORIZATION", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS"]) {
          if (source.includes(secretName)) failures.push(`${path.relative(mobileRoot, full)} references server-only secret ${secretName}.`);
        }
      }
    }
  }
}

if (failures.length) {
  console.error("Cogni monetisation audit failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Cogni monetisation audit passed.");
console.log("✓ App identity and version preserved");
console.log("✓ Exact store products and store-derived pricing only");
console.log("✓ Server-authoritative entitlement and fail-closed premium enforcement");
console.log("✓ RevenueCat customer privacy deletion before account removal");
console.log("✓ HMAC + Authorization webhook boundary and idempotent projection");
console.log("✓ No server-only billing secret in mobile executable source");
