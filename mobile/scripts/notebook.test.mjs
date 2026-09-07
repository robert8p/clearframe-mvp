import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
function load(file, imports = {}) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(id => { assert(id in imports, `Unexpected import ${id}`); return imports[id]; }, mod, mod.exports);
  return mod.exports;
}
const domain = load('lib/notebook-store.ts');
const lenses = load('lib/practice-lenses.ts');
const { emptyNotebook, parseNotebook, saveIdea, recordDay, localDay, validDay, weekProgress, createNotebookRepository } = domain;
const idea = (id = 'question-one', extra = {}) => ({ id, title: 'A useful decision', principle: 'Question the evidence.', application: 'Try it today.', savedOn: '2026-09-07', ...extra });
function storage() {
  const values = new Map(); let failure = null; let writes = 0;
  return {
    values, fail: fn => { failure = fn; }, get writes() { return writes; },
    async getItemAsync(key) { if (failure?.('get', key)) throw Error('read failed'); return values.get(key) ?? null; },
    async setItemAsync(key, value) { if (failure?.('set', key)) throw Error('write failed'); writes++; assert(Buffer.byteLength(value, 'utf8') < 2048); values.set(key, value); },
    async deleteItemAsync(key) { if (failure?.('delete', key)) throw Error('delete failed'); values.delete(key); },
  };
}
test('Device tools start empty with no target and never invent prior practice', () => {
  assert.deepEqual(emptyNotebook(), { version: 1, goal: null, days: [], ideas: [] });
  assert.equal(weekProgress(emptyNotebook(), new Date(2026, 8, 7)).count, 0);
});
test('Calendar validation rejects rolled dates, malformed dates and nonstrings', () => {
  for (const day of ['2026-02-29', '2026-13-01', '2026-04-31', '2026-1-01', '', null, 1]) assert.equal(validDay(day), false);
  assert(validDay('2024-02-29')); assert.equal(localDay(new Date(2026, 8, 7, 23)), '2026-09-07');
});
test('Parsing filters malformed records and duplicate dates and ideas', () => {
  const state = parseNotebook(JSON.stringify({ version: 1, goal: 100, days: ['2026-09-07', '2026-09-07', 'invalid'], ideas: [idea(), idea(), { title: 'missing data' }] }));
  assert.equal(state.goal, null); assert.deepEqual(state.days, ['2026-09-07']); assert.equal(state.ideas.length, 1);
  assert.throws(() => parseNotebook('{broken')); assert.throws(() => parseNotebook('{}')); assert.throws(() => parseNotebook('{"version":2,"days":[],"ideas":[]}'));
});
test('Saving replaces the same idea, keeps most recent first and caps at twelve', () => {
  let state = emptyNotebook(); for (let i = 0; i < 20; i++) state = saveIdea(state, idea(String(i)));
  assert.equal(state.ideas.length, 12); assert.equal(state.ideas[0].id, '19'); assert.equal(state.ideas.at(-1).id, '8');
  state = saveIdea(state, idea('10', { title: 'Revisited' })); assert.equal(state.ideas[0].title, 'Revisited'); assert.equal(state.ideas.length, 12);
});
test('Idea input is bounded without breaking emoji and invalid ideas fail before saving', () => {
  const saved = saveIdea(emptyNotebook(), idea('emoji', { title: '🙂'.repeat(300), principle: '🙂'.repeat(900) }));
  assert.equal(Array.from(saved.ideas[0].title).length, 100); assert.equal(Array.from(saved.ideas[0].principle).length, 420);
  assert.throws(() => saveIdea(emptyNotebook(), idea('', {}))); assert.throws(() => saveIdea(emptyNotebook(), idea('x', { principle: '' })));
});
test('Repeated answers on one date count one day and retain at most 28 dates', () => {
  let state = recordDay(emptyNotebook(), '2026-09-07'); assert.equal(recordDay(state, '2026-09-07'), state);
  for (let i = 1; i <= 30; i++) state = recordDay(state, `2026-09-${String(i).padStart(2, '0')}`);
  assert.equal(state.days.length, 28); assert.throws(() => recordDay(state, '2026-02-30'));
});
test('Weekly rhythm uses Monday–Sunday and excludes future records', () => {
  const state = { ...emptyNotebook(), goal: 3, days: ['2026-09-06', '2026-09-07', '2026-09-09', '2026-09-13'] };
  const result = weekProgress(state, new Date(2026, 8, 9, 22));
  assert.equal(result.days[0].key, '2026-09-07'); assert.equal(result.days.at(-1).key, '2026-09-13'); assert.equal(result.count, 2); assert.equal(result.days[2].today, true);
});
test('Weekly calendar crosses year and daylight-saving boundaries without duplicate days', () => {
  for (const date of [new Date(2026, 2, 29), new Date(2026, 9, 25), new Date(2027, 0, 1)]) {
    const result = weekProgress(emptyNotebook(), date); assert.equal(new Set(result.days.map(d => d.key)).size, 7); assert(result.days.every(d => validDay(d.key))); assert.equal(result.days.filter(d => d.today).length, 1);
  }
});
test('Encrypted repository survives a cold restart without changing online data', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'account-a');
  await repo.update(current => saveIdea(recordDay(current, '2026-09-07'), idea()));
  const next = await createNotebookRepository(disk, 'account-a').load(); assert.equal(next.ideas[0].id, 'question-one'); assert.equal(next.days.length, 1);
  assert([...disk.values.keys()].every(key => key.startsWith('cogni.tools.v1.account-a.')));
});
test('Encrypted repository scopes identical idea IDs to separate accounts', async () => {
  const disk = storage(); const a = createNotebookRepository(disk, 'a'), b = createNotebookRepository(disk, 'b');
  await a.update(current => saveIdea(current, idea('same', { title: 'Private A' })));
  assert.equal((await b.load()).ideas.length, 0); await b.update(current => saveIdea(current, idea('same', { title: 'Private B' })));
  assert.equal((await a.load()).ideas[0].title, 'Private A'); assert.throws(() => createNotebookRepository(disk, '../unsafe'));
});
test('Worst-case Unicode stays below SecureStore per-value limits and round-trips twelve full records', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'unicode');
  let state = emptyNotebook(); for (let i = 0; i < 12; i++) state = saveIdea(state, idea(String(i), { title: '🧠'.repeat(100), principle: '🧠'.repeat(420), application: '🧠'.repeat(420) }));
  await repo.update(() => state); const result = await createNotebookRepository(disk, 'unicode').load(); assert.deepEqual(result, state); assert(disk.values.size > 30);
});
test('Failed inactive-bank write keeps the last completed notebook after a restart', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'atomic');
  await repo.update(current => saveIdea(current, idea('original')));
  disk.fail((op, key) => op === 'set' && key.endsWith('.b.count'));
  await assert.rejects(repo.update(current => saveIdea(current, idea('not-committed')))); disk.fail(null);
  assert.deepEqual((await createNotebookRepository(disk, 'atomic').load()).ideas.map(x => x.id), ['original']);
  await repo.update(current => saveIdea(current, idea('retry'))); assert.equal((await repo.load()).ideas[0].id, 'retry');
});
test('Failed pointer commit never exposes a partially saved new record', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'pointer'); await repo.update(current => saveIdea(current, idea('old')));
  disk.fail((op, key) => op === 'set' && key.endsWith('.current')); await assert.rejects(repo.update(current => saveIdea(current, idea('new')))); disk.fail(null);
  assert.equal((await createNotebookRepository(disk, 'pointer').load()).ideas[0].id, 'old');
});
test('Rapid parallel saves and goal changes are serialized without dropped records', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'queue');
  await Promise.all([repo.update(s => saveIdea(s, idea('one'))), repo.update(s => ({ ...s, goal: 3 })), repo.update(s => saveIdea(s, idea('two'))), repo.update(s => recordDay(s, '2026-09-07'))]);
  const result = await repo.load(); assert.equal(result.goal, 3); assert.equal(result.ideas.length, 2); assert.equal(result.days.length, 1);
});
test('A repeated practice day does not write storage again', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'dedup'); await repo.update(s => recordDay(s, '2026-09-07')); const before = disk.writes;
  await repo.update(s => recordDay(s, '2026-09-07')); assert.equal(disk.writes, before);
});
test('Missing chunks fail visibly rather than silently creating an empty notebook', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'corrupt'); await repo.update(s => saveIdea(s, idea())); disk.values.delete('cogni.tools.v1.corrupt.a.0');
  await assert.rejects(createNotebookRepository(disk, 'corrupt').load(), /incomplete/);
});
test('Clearing removes both banks and partial chunks only for the active account', async () => {
  const disk = storage(); const a = createNotebookRepository(disk, 'a'), b = createNotebookRepository(disk, 'b');
  await a.update(s => saveIdea(s, idea())); await a.update(s => ({ ...s, goal: 5 })); await b.update(s => saveIdea(s, idea()));
  await a.clear(); assert.deepEqual(await a.load(), emptyNotebook()); assert(![...disk.values.keys()].some(k => k.startsWith('cogni.tools.v1.a.'))); assert.equal((await b.load()).ideas.length, 1);
});
test('Interrupted clear fails and retry clears successfully without returning cached success', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'clear'); await repo.update(s => saveIdea(s, idea()));
  disk.fail((op, key) => op === 'delete' && key.endsWith('.a.count')); await assert.rejects(repo.clear()); disk.fail(null);
  await assert.rejects(repo.load()); await repo.clear(); assert.deepEqual(await repo.load(), emptyNotebook());
});
test('Clearing after pending saves wins and does not resurrect prior data', async () => {
  const disk = storage(); const repo = createNotebookRepository(disk, 'order');
  await Promise.all([repo.update(s => saveIdea(s, idea())), repo.clear()]); assert.deepEqual(await createNotebookRepository(disk, 'order').load(), emptyNotebook());
});
test('Daily reflection rotates across twelve dates and keeps all six audience contexts', () => {
  const ids = Array.from({ length: 12 }, (_, i) => lenses.practiceLens(`2026-09-${String(i + 1).padStart(2, '0')}`, 'casual').id); assert.equal(new Set(ids).size, 12);
  const contexts = ['casual', 'university_student', 'graduate_early_career', 'junior_professional', 'management', 'executive'].map(a => lenses.practiceLens('2026-09-07', a).context); assert.equal(new Set(contexts).size, 6);
  assert.equal(lenses.practiceLens('bad', 'unknown').id, lenses.PRACTICE_LENSES[0].id);
});
test('Sample decisions have real explanations, unique options and varied correct positions', () => {
  assert.equal(lenses.SAMPLE_DECISIONS.length, 3); assert.equal(new Set(lenses.SAMPLE_DECISIONS.map(s => s.correct)).size, 3);
  for (const item of lenses.SAMPLE_DECISIONS) { assert(item.explanation.length > 60); assert.equal(new Set(item.options).size, item.options.length); assert(item.options[item.correct]); }
});
// Execute the actual demo's handlers. Native layout and navigation have their own installed-APK gate.
function demo() {
  const states = []; let cursor = 0; const navigation = [], announcements = [], feedback = [];
  const hooks = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; }, useRef: initial => hooks.useState(() => ({ current: initial }))[0], useEffect: () => {} };
  const named = names => Object.fromEntries(names.split(' ').map(x => [x, x]));
  const imports = { react: hooks, 'react-native': { ...named('Pressable Text View'), AccessibilityInfo: { announceForAccessibility: x => announcements.push(x) } }, 'expo-router': { router: { push: x => navigation.push(x), replace: x => navigation.push(x) } }, '@/components/ui': named('Body Card Eyebrow PrimaryButton ProgressBar Screen Title'), '@/lib/practice-lenses': lenses, '@/lib/theme': { colors: {} }, '@/lib/accessibility': { useReducedMotion: () => true }, '@/lib/feedback': { useFeedback: () => ({ playFeedback: x => feedback.push(x) }) } };
  const component = load('app/demo.tsx', imports).default;
  return { render() { cursor = 0; return component(); }, navigation, announcements, feedback };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]; }
function control(tree, label) { const node = nodes(tree).find(n => n.props?.label === label || n.props?.accessibilityLabel === label); assert(node, `Missing ${label}`); return node.props; }
function content(tree) { return Array.isArray(tree) ? tree.map(content).join(' ') : !tree || typeof tree === 'boolean' ? '' : typeof tree === 'object' ? content(tree.props?.children) : String(tree); }
test('Sample starts without a preselected answer and guards a forced disabled-handler invocation', () => {
  const app = demo(); const button = control(app.render(), 'See the reasoning'); assert.equal(button.disabled, true); button.onPress(); assert.equal(app.feedback.length, 0); assert(!content(app.render()).includes('Citations are a starting point, not proof.'));
});
test('Sample selection reveals the actual explanation and announces feedback accessibly', () => {
  const app = demo(); control(app.render(), lenses.SAMPLE_DECISIONS[0].options[1]).onPress(); control(app.render(), 'See the reasoning').onPress();
  assert(content(app.render()).includes(lenses.SAMPLE_DECISIONS[0].explanation)); assert.equal(app.announcements.length, 1); assert.deepEqual(app.feedback, ['selection', 'correct']);
  assert.equal(control(app.render(), lenses.SAMPLE_DECISIONS[0].options[1]).disabled, true);
});
test('All three sample decisions reach signup without account, network or persisted scores', () => {
  const app = demo();
  for (let i = 0; i < 3; i++) { control(app.render(), lenses.SAMPLE_DECISIONS[i].options[0]).onPress(); control(app.render(), 'See the reasoning').onPress(); control(app.render(), i === 2 ? 'Finish the sample' : 'Try another decision').onPress(); }
  assert.match(content(app.render()), /Your sample answers do not affect your scores/); control(app.render(), 'Get started').onPress(); assert.deepEqual(app.navigation, ['/signup']);
});
test('Leaving sample returns to welcome without signing up or saving a result', () => {
  const app = demo(); control(app.render(), 'Back to welcome').onPress(); assert.deepEqual(app.navigation, ['/']);
});
test('Practice tools are scoped by account before children render and never write entitlement state', () => {
  const provider = fs.readFileSync(new URL('../lib/notebook.tsx', import.meta.url), 'utf8');
  assert.match(provider, /<ScopedNotebook key=\{id \?\? "signed-out"\}/); assert(!provider.includes('apiFetch')); assert(!provider.includes('entitlement'));
  const toolkit = fs.readFileSync(new URL('../app/toolkit.tsx', import.meta.url), 'utf8'); assert(!toolkit.includes('apiFetch')); assert.match(toolkit, /Share\.share/); assert(!toolkit.includes('user.email')); assert(!toolkit.includes('summary'));
});
