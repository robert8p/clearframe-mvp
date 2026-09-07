import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/entitlements.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 4; i += 1) await new Promise(resolve => setImmediate(resolve)); };
const monthly = { kind: 'monthly', identifier: '$rc_monthly', productId: 'cogni_pro_monthly', raw: { id: 'native-monthly' } };
const offering = { identifier: 'default', monthly, annual: null, annualSavingPercent: null };
const customer = (pro = false, user = 'A') => ({ managementURL: `https://store.test/${user}`, entitlements: { active: pro ? { pro: { isActive: true } } : {} } });
const server = (patch = {}) => ({
  isPro: false, stateReliable: true, entitlement: null,
  config: { monetizationEnabled: true, freeCoreSessionsPerDay: 1, focusedPracticeIsPro: true, progressHistoryFreeDays: 7, proactivePaywallMinSessions: 3, paywallExperiment: 'control' },
  serverTime: '2026-09-07T00:00:00Z', ...patch,
});

// Execute the actual provider's hooks/effects and async callbacks. Native billing,
// auth and transport are the only dependencies mocked; no entitlement logic is
// reimplemented here. State commits are microtask-batched and effects clean up
// on dependency changes, allowing deterministic account/network races in Node.
function fixture(options = {}) {
  let user = options.user ?? 'A', value, cursor = 0, pendingEffects = [], scheduled = false, disposed = false;
  let nativeUser = null, writesAfterUnmount = 0;
  const slots = [], appListeners = new Set(), storeListeners = new Set(), events = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const schedule = () => {
    if (scheduled || disposed) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; if (!disposed) render(); });
  };
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (type, props) => ({ type, props }),
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        if (disposed) { writesAfterUnmount += 1; return; }
        slots[i].value = typeof next === 'function' ? next(slots[i].value) : next;
        schedule();
      }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { value: factory(), deps };
      return slots[i].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!slots[i] || !same(slots[i].deps, deps)) {
        const previous = slots[i];
        slots[i] = { deps, cleanup: undefined };
        pendingEffects.push(() => { previous?.cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
  };
  class ApiError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
  const apiFetch = async (path, request) => {
    events.push({ type: 'api', path, user });
    if (path.endsWith('/analytics')) return {};
    return options.api ? options.api(path, request, user) : server();
  };
  const purchases = {
    hasRevenueCatPublicKey: () => options.configured !== false,
    identifyPurchasesUser: async id => {
      events.push({ type: 'identify:start', user: id });
      if (options.identify) await options.identify(id);
      nativeUser = id;
      events.push({ type: 'identify:end', user: id });
      return true;
    },
    clearLocalPurchasesUserState: () => { events.push({ type: 'clear' }); nativeUser = null; },
    getCustomerInfo: async () => options.customer ? options.customer(nativeUser) : customer(false, nativeUser),
    loadDefaultOffering: async () => options.offering ? options.offering() : offering,
    listenForCustomerInfo: listener => { storeListeners.add(listener); return () => storeListeners.delete(listener); },
    purchaseCogniPackage: async pkg => {
      events.push({ type: 'purchase', user: nativeUser, pkg });
      return options.purchase ? options.purchase(pkg, nativeUser) : { customerInfo: customer(true, nativeUser) };
    },
    restoreCogniPurchases: async () => {
      events.push({ type: 'restore', user: nativeUser });
      return options.restore ? options.restore(nativeUser) : customer(true, nativeUser);
    },
    isPurchaseCancellation: error => error?.userCancelled === true,
    purchaseErrorCode: () => 'test_error',
  };
  const modules = {
    react,
    'react-native': { AppState: { addEventListener: (_event, listener) => { appListeners.add(listener); return { remove: () => appListeners.delete(listener) }; } } },
    '@/lib/auth': { useAuth: () => ({ session: user ? { user: { id: user } } : null }) },
    '@/lib/api': { ApiError, apiFetch },
    '@/lib/purchases': purchases,
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', '__DEV__', compiled)(name => {
    assert(name in modules, `Unexpected provider dependency: ${name}`);
    return modules[name];
  }, module, module.exports, false);
  function render() {
    cursor = 0; pendingEffects = [];
    value = module.exports.EntitlementProvider({ children: null }).props.value;
    for (const run of pendingEffects) run();
  }
  render();
  return {
    options, events,
    get value() { return value; },
    get nativeUser() { return nativeUser; },
    get writesAfterUnmount() { return writesAfterUnmount; },
    switchUser(next) { user = next; render(); },
    foreground() { for (const listener of appListeners) listener('active'); },
    storeUpdate(info) { for (const listener of storeListeners) listener(info); },
    dispose() { for (const slot of slots) slot?.cleanup?.(); disposed = true; },
  };
}

for (const [name, patch] of [
  ['launch flag disabled', { config: { ...server().config, monetizationEnabled: false } }],
  ['server state unreliable', { stateReliable: false }],
]) test(`Real purchase action does not open the native sheet: ${name}`, async () => {
  const f = fixture({ api: async () => server(patch) });
  await flush();
  assert.equal(f.value.billingStatus, 'ready');
  const result = await f.value.purchase(monthly);
  assert.equal(result.ok, false);
  assert.equal(f.events.filter(x => x.type === 'purchase').length, 0);
  f.dispose();
});

test('Native purchase requires a configured store, loaded offering and exact current package', async () => {
  for (const options of [{ configured: false }, { offering: async () => null }, { offering: async () => { throw new Error('store offline'); } }]) {
    const f = fixture(options); await flush();
    assert.equal((await f.value.purchase(monthly)).ok, false);
    assert.equal(f.events.filter(x => x.type === 'purchase').length, 0); f.dispose();
  }
  const f = fixture(); await flush();
  assert.equal((await f.value.purchase({ ...monthly, raw: { id: 'different-native-product' } })).ok, false);
  assert.equal(f.events.filter(x => x.type === 'purchase').length, 0); f.dispose();
});

test('Valid purchase identifies the current account and waits for reliable server confirmation', async () => {
  const f = fixture({ api: async path => server({ isPro: path.endsWith('/sync') }) }); await flush();
  const result = await f.value.purchase(monthly); await flush();
  assert.equal(result.outcome, 'success'); assert.equal(f.value.isPro, true);
  assert.deepEqual(f.events.filter(x => x.type === 'purchase').map(x => x.user), ['A']); f.dispose();
});

test('Native success alone never grants Pro and unreliable server success stays pending', async () => {
  const f = fixture({ api: async path => server(path.endsWith('/sync') ? { isPro: true, stateReliable: false } : {}) }); await flush();
  assert.equal((await f.value.purchase(monthly)).outcome, 'pending_verification'); f.dispose();
  const g = fixture({ api: async path => { if (path.endsWith('/sync')) throw new Error('offline'); return server(); } }); await flush();
  assert.equal((await g.value.purchase(monthly)).outcome, 'pending_verification'); await flush();
  assert.equal(g.value.isPro, false); assert.equal(g.value.localStoreShowsPro, true); assert.equal(g.value.stateReliable, false); g.dispose();
});

test('Restore stays available with new sales disabled and no offering, including initial server outage', async () => {
  for (const initialFailure of [false, true]) {
    const f = fixture({
      offering: async () => null,
      api: async path => {
        if (!path.endsWith('/sync') && initialFailure) throw new Error('server offline');
        return server({ isPro: path.endsWith('/sync'), config: { ...server().config, monetizationEnabled: false } });
      },
    }); await flush();
    assert.equal(f.value.billingStatus, 'no_offerings');
    assert.equal((await f.value.restore()).outcome, 'success');
    assert.deepEqual(f.events.filter(x => x.type === 'restore').map(x => x.user), ['A']); f.dispose();
  }
});

test('A store subscription awaiting server sync is pending, never reported as no subscription', async () => {
  const f = fixture(); await flush();
  assert.equal((await f.value.restore()).outcome, 'pending_verification'); f.dispose();
  const g = fixture({ restore: async () => customer(false) }); await flush();
  assert.equal((await g.value.restore()).outcome, 'no_subscription'); g.dispose();
});

test('Previous account data disappears immediately, before the new account request finishes', async () => {
  const pending = deferred();
  const f = fixture({ api: async (_path, _request, user) => user === 'A' ? server({ isPro: true }) : pending.promise }); await flush();
  assert.equal(f.value.isPro, true); assert.equal(f.value.managementUrl, 'https://store.test/A');
  f.switchUser('B');
  assert.equal(f.value.isPro, false); assert.equal(f.value.managementUrl, null); assert.equal(f.value.stateReliable, false); assert.equal(f.value.offering, null);
  pending.resolve(server()); await flush(); assert.equal(f.value.managementUrl, 'https://store.test/B'); f.dispose();
});

test('Late server responses cannot overwrite a switched account, including A → B → A', async () => {
  const pending = deferred(); let first = true;
  const f = fixture({ api: async () => { if (first) { first = false; return pending.promise; } return server(); } });
  f.switchUser('B'); await flush(); f.switchUser('A'); await flush();
  pending.resolve(server({ isPro: true })); await flush();
  assert.equal(f.value.isPro, false); assert.equal(f.value.managementUrl, 'https://store.test/A'); f.dispose();
});

test('Late store identification and results cannot change the next account or its offering', async () => {
  const pending = deferred(); let first = true;
  const f = fixture({ identify: async id => { if (id === 'A' && first) { first = false; await pending.promise; } } }); await flush();
  f.switchUser('B'); await flush();
  assert.equal(f.events.filter(x => x.type === 'identify:start' && x.user === 'B').length, 0);
  pending.resolve(); await flush();
  assert.equal(f.nativeUser, 'B'); assert.equal(f.value.managementUrl, 'https://store.test/B'); assert.equal(f.value.billingStatus, 'ready'); f.dispose();
});

for (const action of ['purchase', 'restore']) test(`Late ${action} completion cannot unlock the next account or return success`, async () => {
  const pending = deferred();
  const f = fixture({
    [action]: async () => pending.promise,
    api: async (path, _request, user) => server({ isPro: user === 'A' && path.endsWith('/sync') }),
  }); await flush();
  const previousAction = f.value[action];
  const result = action === 'purchase' ? previousAction(monthly) : previousAction(); await flush();
  f.switchUser('B'); await flush();
  pending.resolve(action === 'purchase' ? { customerInfo: customer(true, 'A') } : customer(true, 'A'));
  assert.equal((await result).outcome, 'error'); await flush();
  assert.equal(f.value.isPro, false); assert.equal(f.value.localStoreShowsPro, false); assert.equal(f.value.managementUrl, 'https://store.test/B');
  assert.equal(f.events.filter(x => x.type === 'api' && x.path.endsWith('/sync')).length, 0);
  assert.equal((await (action === 'purchase' ? previousAction(monthly) : previousAction())).ok, false); f.dispose();
});

test('The launch flag is rechecked after native identity preparation', async () => {
  const pending = deferred(); let identifies = 0, enabled = true;
  const f = fixture({
    identify: async () => { if (++identifies === 2) await pending.promise; },
    api: async () => server({ config: { ...server().config, monetizationEnabled: enabled } }),
  }); await flush();
  const purchase = f.value.purchase(monthly); await flush();
  enabled = false; const refresh = f.value.refresh(); await flush();
  pending.resolve();
  assert.equal((await purchase).ok, false); await refresh;
  assert.equal(f.events.filter(x => x.type === 'purchase').length, 0); f.dispose();
});

test('Duplicate purchase and restore taps open only one native action', async () => {
  const pending = deferred(); const f = fixture({ purchase: async () => pending.promise }); await flush();
  const first = f.value.purchase(monthly); await flush();
  assert.equal((await f.value.purchase(monthly)).ok, false); assert.equal((await f.value.restore()).ok, false);
  assert.equal(f.events.filter(x => ['purchase', 'restore'].includes(x.type)).length, 1);
  pending.resolve({ customerInfo: customer(true) }); await first; f.dispose();
});

test('Foreground server outage is handled and invalidates stale purchase availability', async () => {
  let offline = false;
  const f = fixture({ api: async () => { if (offline) throw new Error('offline'); return server(); } }); await flush();
  offline = true; f.foreground(); await flush();
  assert.equal(f.value.loading, false); assert.equal(f.value.stateReliable, false);
  assert.equal((await f.value.purchase(monthly)).ok, false); f.dispose();
});

test('Older overlapping refresh cannot replace a newer authoritative response', async () => {
  const pending = deferred(); let request = 0;
  const f = fixture({ api: async () => { request += 1; return request === 2 ? pending.promise : server({ isPro: request >= 3 }); } }); await flush();
  const old = f.value.refresh(); await flush(); const latest = f.value.refresh(); await latest;
  assert.equal(f.value.isPro, true);
  pending.resolve(server({ isPro: false })); await old; await flush();
  assert.equal(f.value.isPro, true); assert.equal(f.value.loading, false); f.dispose();
});

test('Sign-out and unmount discard delayed store results and remove listeners', async () => {
  const pending = deferred(); let slow = false;
  const f = fixture({ customer: async user => slow ? pending.promise : customer(false, user) }); await flush();
  slow = true; const refresh = f.value.refresh(); await flush(); f.switchUser(null);
  assert.equal(f.value.managementUrl, null); assert.equal(f.value.offering, null); assert.equal(f.value.isPro, false);
  f.dispose(); pending.resolve(customer(true)); await refresh; await flush();
  assert.equal(f.writesAfterUnmount, 0); f.foreground(); f.storeUpdate(customer(true)); await flush(); assert.equal(f.writesAfterUnmount, 0);
});
