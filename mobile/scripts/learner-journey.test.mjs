import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

// Execute the shipped component and its handlers with deterministic hooks and
// network/native boundaries. Native layout and screen-reader checks remain E2E.
function mount(relative, { props = {}, request = async () => outcome, clock = () => 1000 } = {}) {
  const slots = [], pendingEffects = [], requests = [], cues = [], scrolls = [];
  let cursor = 0, dirty = true, tree;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    createElement(type, props, ...children) {
      if (type === 'Screen' && props?.ref) props.ref.current = { scrollTo: value => scrolls.push(value), scrollToEnd() {} };
      return { type, props: { ...props, children } };
    },
    Fragment: 'Fragment',
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value; if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }];
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useMemo(factory, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; },
    useEffect(effect, deps) { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) { slots[i] = { deps }; pendingEffects.push(effect); } },
  };
  react.useCallback = (fn, deps) => react.useMemo(() => fn, deps);
  const feedback = { playFeedback: cue => cues.push(cue) };
  const ui = Object.fromEntries(['Screen', 'Body', 'Card', 'EditorialPanel', 'SectionHeader', 'Eyebrow', 'Title', 'PrimaryButton', 'ProgressBar', 'ActionLink', 'ErrorState', 'LoadingState'].map(name => [name, name]));
  const imports = {
    react,
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Keyboard: { dismiss() {} }, AccessibilityInfo: { announceForAccessibility() {} }, Animated: { View: 'Animated.View', Value: class { constructor(value){ this.value=value; } setValue(value){ this.value=value; } stopAnimation(){} interpolate(){ return 1; } }, sequence(){ return { start(){} }; }, spring(){ return {}; }, timing(){ return {}; }, loop(){ return { start(){}, stop(){} }; } } },
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    '@/components/brand': { CogniMark: 'CogniMark' },
    '@/components/form-field': { FormField: 'FormField' },
    '@/lib/api': { todayApiPath: () => '/api/mobile/today', apiFetch: async (path, options) => { requests.push({ path, body: options?.body && JSON.parse(options.body) }); return request(path, options); } },
    '@/lib/accessibility': { useReducedMotion: () => true },
    '@/lib/notebook': { useNotebook: () => ({ recordPracticeDay: async () => {} }) },
    '@/components/practice-tools': { SaveIdeaButton: 'SaveIdeaButton', DeviceToolsNotice: 'DeviceToolsNotice' },
    '@/components/visuals': { CogniIcon: 'CogniIcon', SkillMotif: 'SkillMotif', motifForSkill: () => 'reasoning' },
    '@/lib/feedback': { useFeedback: () => feedback },
    '@/lib/theme': { colors: {}, glow: {}, radius: { sm:12, md:18, lg:24, xl:30, pill:999 }, typography: {} },
    '@/components/ui': ui,
    'expo-router': { router: { replace() {} }, Redirect: 'Redirect', useFocusEffect: callback => react.useEffect(callback, [callback]) },
  };
  const source = fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'Date', code)(name => { if (!(name in imports)) throw Error(`Unexpected dependency ${name}`); return imports[name]; }, module, module.exports, { now: clock });
  const component = module.exports.QuestionRunner ?? module.exports.default;
  function render() { let renders = 0; do { dirty = false; cursor = 0; tree = component(props); while (pendingEffects.length) pendingEffects.shift()(); assert(++renders < 12, 'Unbounded component rerender'); } while (dirty); return tree; }
  function nodes(value = tree) { if (!value || typeof value !== 'object') return []; if (Array.isArray(value)) return value.flatMap(item => nodes(item ?? null)); return [value, ...nodes(value.props?.children ?? null)]; }
  function find(label) { const node = nodes().find(node => node.props.label === label || node.props.accessibilityLabel === label); assert(node, `Missing ${label}`); return node; }
  async function flush() { await new Promise(resolve => setImmediate(resolve)); render(); }
  render();
  return { render, nodes, find, requests, cues, scrolls, flush, text: () => JSON.stringify(tree, (_key, value) => typeof value === 'function' ? undefined : value), press(label) { find(label).props.onPress(); render(); } };
}
const outcome = { correct: true, correctIndex: 0, correctAnswer: [0], scoreFraction: 1, explanation: 'Check the evidence.', thinkingPrinciple: 'Ask what would change your mind.', application: 'Verify the source.', xpEarned: 5, skillUpdates: [] };
const question = (id, extra = {}) => ({ id, title: `Question ${id}`, prompt: 'Choose an answer.', options: ['One', 'Two', 'Three'], interaction_type: 'single_choice', interaction_config: {}, difficulty: 50, confidence_required: false, ...extra });
const runner = (challenges, extras = {}, config = {}) => mount('components/question-runner.tsx', { props: { mode: 'training', sessionId: 'session', challenges, onComplete() {}, ...extras }, ...config });

test('Confidence requires a deliberate choice, submits that choice, and resets for the next question', async () => {
  const f = runner([question('a', { confidence_required: true }), question('b', { confidence_required: true })]);
  assert(f.nodes().filter(n => n.props.accessibilityRole === 'radio').every(n => n.props.accessibilityState.checked === false));
  f.press('One'); assert.equal(f.find('Submit answer').props.disabled, true);
  f.press('Submit answer'); await f.flush(); assert.equal(f.requests.length, 0);
  f.press('80 percent confident'); assert.equal(f.find('Submit answer').props.disabled, false);
  f.press('Submit answer'); await f.flush(); assert.equal(f.requests[0].body.confidence, 80);
  f.press('Next question'); f.press('One'); assert.equal(f.find('Submit answer').props.disabled, true);
  assert(f.text().includes('Choose your confidence above to submit.'));
});

test('Ordinary answers do not record invented confidence; long-open questions stay within the API contract', async () => {
  let now = 1000; const f = runner([question('a')], {}, { clock: () => now });
  f.press('One'); now += 7200000; f.press('Submit answer'); await f.flush();
  assert.equal(f.requests[0].body.confidence, null); assert.equal(f.requests[0].body.responseTimeMs, 3600000);
});

test('An answer write is single-flight and a failed write keeps the choice available to retry', async () => {
  let reject; const f = runner([question('a')], {}, { request: () => new Promise((_resolve, fail) => { reject = fail; }) });
  f.press('One'); const submit = f.find('Submit answer').props.onPress; submit(); submit(); f.render();
  assert.equal(f.requests.length, 1); f.press('Two'); assert.equal(f.find('One').props.selected, true);
  reject(Error('Connection interrupted')); await f.flush(); assert(f.text().includes('Connection interrupted'));
  assert.equal(f.find('One').props.selected, true); assert.equal(f.find('Submit answer').props.loading, false);
});

test('Multi-select enforces the authored count and permits changing a choice without exceeding it', async () => {
  const f = runner([question('a', { interaction_type: 'multi_select', interaction_config: { requiredSelections: 2 } })]);
  assert.equal(f.find('One').props.role, 'checkbox'); f.press('One'); assert.equal(f.find('Submit answers').props.disabled, true);
  f.press('Two'); f.press('Three'); assert.equal(f.find('Three').props.selected, false);
  f.press('One'); f.press('Three'); f.press('Submit answers'); await f.flush();
  assert.deepEqual(f.requests[0].body.responsePayload, [1, 2]);
});

test('Ranking supports remove-and-reinsert and submits the displayed complete order', async () => {
  const f = runner([question('a', { interaction_type: 'ranking' })]);
  assert(f.text().includes('Tap each answer in your chosen order.')); f.press('Two'); f.press('One');
  assert.equal(f.find('Use this order').props.disabled, true); f.press('Two'); f.press('Three'); f.press('Two');
  assert.equal(f.find('Two').props.accessibilityLabel, '3. Two'); f.press('Use this order'); await f.flush();
  assert.deepEqual(f.requests[0].body.responsePayload, [0, 2, 1]);
});

test('Classification requires a group for every item and submits the visible assignments', async () => {
  const f = runner([question('a', { interaction_type: 'classification', interaction_config: { categories: [{ id: 'fact', label: 'Fact' }, { id: 'guess', label: 'Guess' }] } })]);
  f.press('One: Fact'); f.press('Two: Guess'); assert.equal(f.find('Check my groups').props.disabled, true);
  f.press('Three: Fact'); f.press('Check my groups'); await f.flush();
  assert.deepEqual(f.requests[0].body.responsePayload, { 0: 'fact', 1: 'guess', 2: 'fact' });
});

test('Resume skips only saved session questions; feedback scrolls once and completion preserves the right destination', async () => {
  let finished = 0;
  const f = runner([question('a'), question('b')], { mode: 'practice', answeredChallengeIds: ['a', 'a', 'other'], onComplete: () => { finished++; } });
  assert(f.text().includes('Question b')); assert.equal(f.nodes().find(n => n.type === 'ProgressBar').props.value, 50);
  f.press('One'); await (f.press('Submit answer'), f.flush());
  const result = f.nodes().find(n => n.props.onLayout); const event = { nativeEvent: { layout: { y: 800 } } };
  result.props.onLayout(event); result.props.onLayout(event); assert.deepEqual(f.scrolls.at(-1), { y: 788, animated: false });
  assert.equal(f.scrolls.filter(s => s.y === 788).length, 1); f.press('Finish training');
  assert(f.text().includes('answers are saved')); const finish = f.find('Back to skills').props.onPress; finish(); finish(); await f.flush(); assert.equal(finished, 1);
});

for (const typed of [false, true]) test(`Lesson reflection ${typed ? 'with private text' : 'without typing'} completes without sending text`, async () => {
  const lesson = { id: 'lesson-a', title: 'Look for evidence', content: { story: 'Story', twist: 'Twist', principle: 'Principle', try_it: 'Reflect first', reveal: 'Reveal', ai_age: 'Application' } };
  const f = mount('app/(tabs)/train/lesson.tsx', { request: async path => path === '/api/mobile/today' ? { state: 'lesson', lesson } : { ok: true, xpEarned: 5 } });
  await f.flush(); assert.equal(f.find('Reveal the thinking move').props.disabled, true);
  if (typed) { f.find('Your reflection').props.onChangeText('A private thought about my family'); f.render(); f.press('Reveal the thinking move'); }
  else f.press('I’ve reflected without typing');
  assert(f.find('Complete insight +5 XP'));
  f.press('Complete insight +5 XP'); await f.flush(); assert.deepEqual(f.requests.at(-1).body, { lessonId: 'lesson-a' });
});

test('Lesson relevance failure is visible before the learner reveals the answer', async () => {
  const lesson = { id: 'lesson-a', title: 'Look for evidence', scenario_context: 'A decision', content: {} };
  const f = mount('app/(tabs)/train/lesson.tsx', { request: async path => { if (path === '/api/mobile/today') return { state: 'lesson', lesson }; throw Error('Feedback could not be saved.'); } });
  await f.flush(); f.press('Not relevant to me'); await f.flush();
  assert(f.nodes().some(n => n.props.accessibilityLiveRegion === 'assertive' && n.props.children.includes('Feedback could not be saved.')));
});
