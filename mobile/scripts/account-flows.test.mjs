import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
// Actual screen handlers with deterministic hook/native adapters. Installed-device
// navigation, keyboard and accessibility verification remain a separate gate.
const tick = () => new Promise(resolve => setImmediate(resolve));
function screen(file, overrides = {}) {
  const state = []; let cursor = 0; let focused = false;
  const effects = [], alerts = [], navigation = [], calls = [];
  const hooks = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useRef(initial) { return hooks.useState(() => ({ current: initial }))[0]; },
    useCallback: fn => fn, useMemo: fn => fn(), useEffect: () => {},
  };
  const router = { canGoBack: () => overrides.canGoBack ?? false, back: () => navigation.push('back'), replace: path => navigation.push(path), push: path => navigation.push(path) };
  if (overrides.canDismiss !== undefined) router.canDismiss = () => overrides.canDismiss;
  if (overrides.dismiss) router.dismiss = () => navigation.push('dismiss');
  if (overrides.dismissTo) router.dismissTo = path => navigation.push(`dismissTo:${path}`);
  const pkg = { identifier: 'annual', kind: 'annual', priceString: '$24.00', productId: 'cogni_pro_annual', introText: null };
  const entitlement = {
    isPro: false, stateReliable: true, entitlement: null, billingStatus: 'ready', billingMessage: null,
    config: { monetizationEnabled: false, paywallExperiment: 'control' }, offering: { annual: pkg, monthly: null },
    purchase: async () => { calls.push('purchase'); return { ok: true, message: 'active' }; },
    restore: async () => { calls.push('restore'); return { ok: true, message: 'restored' }; },
    recordAnalytics: async () => {}, refresh: async () => {}, openPaywall: () => {}, ...overrides.entitlement,
  };
  const profile = { profile: { id: 'learner-a', email: 'test@example.com', audience_segment: 'casual', full_name: 'Learner' }, summary: { answers: 0 }, skillScores: [] };
  const named = names => Object.fromEntries(names.split(' ').map(name => [name, name]));
  const imports = {
    react: hooks,
    'react-native': { ...named('Text TextInput View Pressable ActivityIndicator Switch'), Alert: { alert: (...args) => alerts.push(args) }, Platform: { OS: 'android' }, Linking: { openURL: async () => {} } },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'expo-router': { router, Redirect: 'Redirect', useLocalSearchParams: () => overrides.params ?? {}, useFocusEffect: effect => { if (!focused) { focused = true; effects.push(effect); } } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => overrides.insets ?? { top: 0, right: 0, bottom: 0, left: 0 } },
    'expo-linking': { createURL: path => `cogni://${path}` },
    '@/components/ui': named('ActionLink Body Card Eyebrow PrimaryButton Screen Title LoadingState ErrorState'),
    '@/components/brand': named('CogniLogo CogniMark'), '@/components/form-field': named('FormField'),
    '@/components/interaction-cues': named('CompactAction'), '@/components/option-picker': named('OptionPicker'), '@/components/achievements': named('AchievementShelf'),
    '@/lib/audience': { isMobileAudience: () => true, mobileAudienceMeta: () => ({ label: 'Everyday learner' }) },
    '@/lib/context-options': { functionLabelForAudience: () => 'Interests', functionOptionsForAudience: () => [], goalOptionsForAudience: () => [] },
    '@/lib/notebook': { useNotebook: () => ({ clear: async () => {} }) },
    '@/lib/feedback': { useFeedback: () => ({ ready: true, soundEnabled: false, hapticsEnabled: false }) },
    '@/lib/auth': { useAuth: () => ({ session: { user: { id: 'learner-a' } }, loading: false, signOut: async () => {}, ...overrides.auth }) },
    '@/lib/supabase': { supabase: { auth: { updateUser: async data => { calls.push(data); return { error: null }; }, resetPasswordForEmail: async email => { calls.push(email); return { error: null }; }, signOut: async () => ({}), ...overrides.supabase } } },
    '@/lib/api': { apiFetch: async (...args) => { calls.push(args); return overrides.api ? overrides.api(...args) : profile; } },
    '@/lib/entitlements': { useEntitlements: () => entitlement }, '@/lib/pro-gate': { useProGate: () => entitlement },
    '@/lib/legal': {}, '@/lib/theme': { colors: {}, glow: {}, radius: { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 }, typography: {} },
    '../app.json': { expo: { version: 'test-version' } }, '../../app.json': { expo: { version: 'test-version' } },
  };
  const source = fs.readFileSync(new URL(`../app/${file}.tsx`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => { assert(id in imports, `Unexpected import: ${id}`); return imports[id]; }, module, module.exports);
  const render = () => { cursor = 0; return module.exports.default(); };
  return { render, alerts, calls, navigation, entitlement, async mount() { render(); effects.forEach(effect => effect()); await tick(); return render(); } };
}
function nodes(tree) {
  if (!tree || typeof tree === 'boolean') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function control(tree, label) {
  const node = nodes(tree).find(node => node.props?.label === label || node.props?.accessibilityLabel === label);
  assert(node, `Missing control ${label}`); return node.props;
}
function content(tree) {
  if (Array.isArray(tree)) return tree.map(content).join(' ');
  if (!tree || typeof tree === 'boolean') return '';
  return typeof tree === 'object' ? content(tree.props?.children) : String(tree);
}
test('Disabled monetisation presents the free preview and a deep-link-safe exit', async () => {
  const app = screen('paywall'); const tree = app.render();
  assert.match(content(tree), /Paid subscriptions are not enabled/);
  assert(!nodes(tree).some(node => node.props?.label?.startsWith('Subscribe')));
  control(tree, 'Continue learning').onPress(); assert.deepEqual(app.navigation, ['/(tabs)/home']);
  control(tree, 'Restore purchases').onPress(); await tick(); assert.deepEqual(app.calls, ['restore']);
});
test('Profile preview paywall Not now exits the modal below Android system chrome', async () => {
  const app = screen('paywall', { params: { source: 'profile' }, dismissTo: true, insets: { top: 80, right: 0, bottom: 0, left: 0 } });
  const tree = app.render();
  const root = nodes(tree).find(node => node.type === 'Screen');
  assert(root.props.contentStyle.paddingTop >= 96);
  control(tree, 'Not now').onPress();
  assert.deepEqual(app.navigation, ['dismissTo:/(tabs)/profile']);
});
test('Unverified entitlement state cannot launch a purchase even if its handler is invoked', async () => {
  const app = screen('paywall', { entitlement: { stateReliable: false, config: { monetizationEnabled: true } } });
  const button = control(app.render(), 'Subscribe — $24.00 / year');
  assert.equal(button.disabled, true); button.onPress(); await tick(); assert.deepEqual(app.calls, []);
});
test('A ready enabled verified offering reaches purchase and unexpected failure restores controls', async () => {
  const app = screen('paywall', { entitlement: { config: { monetizationEnabled: true }, purchase: async () => { throw Error('unexpected store failure'); } } });
  control(app.render(), 'Subscribe — $24.00 / year').onPress(); await tick();
  const tree = app.render(); assert.equal(control(tree, 'Subscribe — $24.00 / year').disabled, false);
  assert.match(content(tree), /Check your store purchase history before trying again/);
});
test('Subscription refresh failure is actionable and does not strand paywall controls', async () => {
  const app = screen('paywall', { entitlement: { stateReliable: false, refresh: async () => { throw Error('offline'); } } });
  control(app.render(), 'Try loading plans again').onPress(); await tick();
  assert.match(content(app.render()), /couldn't check subscription availability/);
  assert.equal(control(app.render(), 'Try loading plans again').disabled, false);
});
test('Password validation prevents short or mismatched credentials from reaching auth', async () => {
  const app = screen('auth/recovery', { params: { source: 'profile' } });
  control(app.render(), 'Save new password').onPress(); await tick(); assert.match(content(app.render()), /Use at least 8 characters/);
  control(app.render(), 'New password').onChangeText('long-password'); control(app.render(), 'Confirm password').onChangeText('different-password');
  control(app.render(), 'Save new password').onPress(); await tick();
  assert.match(content(app.render()), /Passwords do not match/); assert.deepEqual(app.calls, []);
});
test('A successful password change confirms completion before explicit return to profile', async () => {
  const app = screen('auth/recovery', { params: { source: 'profile' } });
  control(app.render(), 'New password').onChangeText('new-private-password'); control(app.render(), 'Confirm password').onChangeText('new-private-password');
  control(app.render(), 'Save new password').onPress(); await tick();
  assert.deepEqual(app.calls, [{ password: 'new-private-password' }]); assert.match(content(app.render()), /Password updated/);
  assert.deepEqual(app.navigation, []); control(app.render(), 'Back to profile').onPress(); assert.deepEqual(app.navigation, ['/(tabs)/profile']);
});
test('Recovery rejects malformed email locally and acknowledges requests without claiming account existence', async () => {
  const app = screen('forgot-password', { auth: { session: null } });
  control(app.render(), 'Email').onChangeText('invalid'); control(app.render(), 'Send recovery email').onPress(); await tick();
  assert.deepEqual(app.calls, []); assert.match(content(app.render()), /Enter a valid email address/);
  control(app.render(), 'Email').onChangeText('learner@example.com'); control(app.render(), 'Send recovery email').onPress(); await tick();
  assert.deepEqual(app.calls, ['learner@example.com']); assert.match(content(app.render()), /If an account uses/);
  assert.match(content(app.render()), /Check your email/); control(app.render(), 'Use a different email').onPress(); assert(control(app.render(), 'Email'));
});
test('Support validates visibly, locks the submitted draft and preserves it after failure', async () => {
  let reject;
  const app = screen('support', { api: () => new Promise((_, no) => { reject = no; }) });
  const initial = app.render(); assert.equal(control(initial, 'Send support request').disabled, false);
  control(initial, 'Send support request').onPress(); await tick(); assert.match(content(app.render()), /at least 10 characters/); assert.equal(app.calls.length, 0);
  control(app.render(), 'Support message').onChangeText('My training session did not resume.'); control(app.render(), 'Send support request').onPress();
  assert.equal(control(app.render(), 'Support message').editable, false);
  assert.equal(JSON.parse(app.calls[0][1].body).appVersion, 'test-version');
  reject(Error('Connection interrupted')); await tick();
  assert.equal(control(app.render(), 'Support message').value, 'My training session did not resume.');
  assert.equal(control(app.render(), 'Support message').editable, true); assert.match(content(app.render()), /Connection interrupted/);
});
test('Profile states unknown subscription status honestly and deletion always warns about store renewal', async () => {
  const app = screen('(tabs)/profile', { entitlement: { stateReliable: false } });
  const tree = await app.mount(); assert.match(content(tree), /Status unavailable/); assert.doesNotMatch(content(tree), /Cogni Free/);
  control(tree, 'Delete account').onPress(); assert.match(app.alerts[0][1], /does not cancel an App Store or Google Play subscription/);
});
test('Profile restore shows its own progress and recovers from an unexpected store error', async () => {
  let reject;
  const app = screen('(tabs)/profile', { entitlement: { restore: () => new Promise((_, no) => { reject = no; }) } });
  const tree = await app.mount(); control(tree, 'Restore purchases').onPress();
  assert(control(app.render(), 'Restoring…')); assert(control(app.render(), 'Save profile'));
  reject(Error('store unavailable')); await tick(); assert(control(app.render(), 'Restore purchases')); assert.equal(app.alerts[0][0], 'Restore incomplete');
});
