import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const pass = (condition, message) => { if (!condition) failures.push(message); };

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) throw new Error(`Unsupported colour ${hex}`);
  return [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255);
}

function luminance(hex) {
  return hexToRgb(hex)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseThemeColours(source) {
  const wanted = ["bg", "bg2", "panel", "panel2", "panel3", "lineStrong", "text", "muted", "soft"];
  return Object.fromEntries(wanted.map((name) => {
    const match = source.match(new RegExp(`${name}:\\s*\"(#[0-9a-fA-F]{6})\"`));
    if (!match) throw new Error(`Could not parse theme colour ${name}`);
    return [name, match[1]];
  }));
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const appConfig = JSON.parse(read("app.json"));
pass(appConfig.expo?.android?.edgeToEdgeEnabled === true, "Android edge-to-edge mode must remain enabled.");
pass(appConfig.expo?.android?.softwareKeyboardLayoutMode === "resize", "Android keyboard layout mode must remain 'resize' for the validated Cogni device flow.");

const tabs = read("app/(tabs)/_layout.tsx");
pass(tabs.includes("useSafeAreaInsets"), "Bottom tabs must use safe-area insets.");
pass(tabs.includes("tabBarHideOnKeyboard: true"), "Bottom tabs must hide while the keyboard is open.");
pass(tabs.includes("tabBarAccessibilityLabel"), "Bottom tabs must expose accessibility labels.");

const ui = read("components/ui.tsx");
const brand = read("components/brand.tsx");
const orb = read("components/orb.tsx");
const rootLayout = read("app/_layout.tsx");
const interactionCues = read("components/interaction-cues.tsx");
pass(ui.includes("useReducedMotion"), "Shared UI motion must respect Reduce Motion.");
pass(brand.includes("useReducedMotion"), "Cogni brand motion must respect Reduce Motion.");
pass(orb.includes("useReducedMotion"), "Cogni orb motion must respect Reduce Motion.");
pass(rootLayout.includes("animation: reducedMotion ? \"none\" : \"default\""), "Navigation transitions must respect Reduce Motion.");
pass(ui.includes("automaticallyAdjustKeyboardInsets"), "Shared scroll screens must automatically adjust keyboard insets.");
pass(ui.includes("minHeight: 56"), "Primary buttons must preserve at least a 56dp height.");
pass(ui.includes("minHeight: 48") && ui.includes("export function ActionLink"), "Inline action links must preserve a 48dp touch target.");
pass(interactionCues.includes("export function CompactAction") && interactionCues.includes('accessibilityRole="button"') && interactionCues.includes("minHeight: 48"), "Compact button-like controls must be real accessible buttons with at least a 48dp target.");
pass(interactionCues.includes("export function StatusLabel") && !interactionCues.match(/function StatusLabel[\s\S]*?borderWidth:/), "Non-interactive status labels must remain visually flat and borderless.");

const formField = read("components/form-field.tsx");
pass(formField.includes("accessibilityLabel"), "Reusable form fields must expose accessibility labels.");
pass(formField.includes("borderColor: colors.cyan"), "Reusable form fields must expose a visible focus state.");

const sourceFiles = walk(root).filter((file) => /\.(tsx|ts)$/.test(file) && !file.includes(`${path.sep}node_modules${path.sep}`) && !file.includes(`${path.sep}.expo${path.sep}`));
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file);
  const smallTarget = /minHeight:\s*(4[0-7])(?:\D|$)/g;
  let match;
  while ((match = smallTarget.exec(source))) failures.push(`${relative} contains a ${match[1]}dp explicit touch-height candidate; interactive controls should be at least 48dp.`);
  if (/<Text\b[^>]*\bonPress=/.test(source)) failures.push(`${relative} uses Text.onPress; use Pressable/ActionLink so the hit target is explicit.`);
  if (/<Pill(?:\s|>)/.test(source)) failures.push(`${relative} uses a non-interactive Pill. Use CompactAction for button-like chips or StatusLabel for informational metadata.`);
}

const welcome = read("app/index.tsx");
pass(!welcome.includes("borderRadius: 21"), "Welcome feature descriptions must not be styled as button-like rounded tiles.");
const profile = read("app/(tabs)/profile.tsx");
pass(!profile.includes("flexBasis: 96, minHeight: 88, borderRadius: 18"), "Profile milestones must remain clearly informational rather than button-like tiles.");

const theme = parseThemeColours(read("lib/theme.ts"));
for (const foreground of ["text", "muted", "soft"]) {
  for (const background of ["bg", "panel", "panel2", "panel3"]) {
    const ratio = contrast(theme[foreground], theme[background]);
    pass(ratio >= 4.5, `${foreground} on ${background} contrast is ${ratio.toFixed(2)}:1; require >= 4.5:1.`);
  }
}
const controlContrast = contrast(theme.lineStrong, theme.panel2);
pass(controlContrast >= 3, `lineStrong on panel2 contrast is ${controlContrast.toFixed(2)}:1; require >= 3:1 for meaningful control boundaries.`);

if (failures.length) {
  console.error("Cogni UI audit failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Cogni UI audit passed.");
console.log("✓ Android safe-area + keyboard invariants");
console.log("✓ Reduce Motion support");
console.log("✓ >=48dp explicit touch-target guard");
console.log("✓ Honest interactive vs informational affordances");
console.log("✓ No direct Text.onPress links");
console.log("✓ Form-field accessibility + focus treatment");
console.log(`✓ Text contrast >=4.5:1; control-boundary contrast ${controlContrast.toFixed(2)}:1`);
