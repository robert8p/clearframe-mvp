import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

function load(relative, imports = {}) {
  const source = fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    assert(name in imports, `Unexpected dependency ${name}`); return imports[name];
  }, module, module.exports);
  return module.exports;
}

// Execute the shipped card, nested controls and score rendering. Only React's
// hook scheduler and native elements are adapted; native layout remains E2E.
function mount(points) {
  const state = new Map();
  let current, tree, dimensions = { width: 430, fontScale: 1 };
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: 'Fragment',
    useState(initial) {
      const context = current, index = context.cursor++;
      if (!(index in context.values)) context.values[index] = typeof initial === 'function' ? initial() : initial;
      return [context.values[index], value => {
        context.values[index] = typeof value === 'function' ? value(context.values[index]) : value;
      }];
    },
  };
  const named = names => Object.fromEntries(names.split(' ').map(name => [name, name]));
  const { ProgressHistoryCard } = load('components/progress-history.tsx', {
    react,
    'react-native': { ...named('Pressable Text View'), useWindowDimensions: () => dimensions },
    '@/components/ui': named('Body Card Eyebrow PrimaryButton Title'),
    '@/lib/learning-view': load('lib/learning-view.ts'),
    '@/lib/theme': { colors: { cyan: '#66e3cd' } },
  });
  const props = { history: { access: 'full', freeDays: 7, windowDays: null, availableFrom: null, availableTo: null, points }, showUpgrade: false, onUpgrade() {} };
  function resolve(value, path = 'root') {
    if (Array.isArray(value)) return value.map((child, index) => resolve(child, `${path}/${child?.props?.key ?? index}`));
    if (!value || typeof value !== 'object') return value;
    if (typeof value.type === 'function') {
      const key = `${path}:${value.type.name}`;
      if (!state.has(key)) state.set(key, []);
      const previous = current;
      current = { cursor: 0, values: state.get(key) };
      const rendered = value.type(value.props);
      current = previous;
      return resolve(rendered, key);
    }
    return { ...value, props: { ...value.props, children: resolve(value.props.children, `${path}/children`) } };
  }
  function render() { tree = resolve({ type: ProgressHistoryCard, props }); }
  function nodes(value = tree) {
    if (Array.isArray(value)) return value.flatMap(nodes);
    if (!value || typeof value !== 'object') return [];
    return [value, ...nodes(value.props.children)];
  }
  function content(value = tree) {
    if (Array.isArray(value)) return value.map(content).join(' ');
    if (value == null || typeof value === 'boolean') return '';
    return typeof value === 'object' ? content(value.props.children) : String(value);
  }
  function find(id) {
    const found = nodes().find(node => node.props.testID === id);
    assert(found, `Missing ${id}`); return found.props;
  }
  render();
  return {
    find, content: () => content().replace(/\s+/g, ' ').trim(), nodes,
    has: id => nodes().some(node => node.props.testID === id),
    press(id) { const control = find(id); assert(!control.disabled, `${id} is disabled`); control.onPress(); render(); },
    resize(values) { dimensions = { ...dimensions, ...values }; render(); },
  };
}

const point = (date, score, skillId = 'analysis', skillName = 'Analysis') => ({ date, score, skillId, skillName, reliability: 0.4, attempts: 3, skillSlug: skillId });
const analysis = Array.from({ length: 16 }, (_, index) => point(`2026-08-${String(index + 1).padStart(2, '0')}`, index * 3));
const evidence = Array.from({ length: 9 }, (_, index) => point(`2026-09-${String(index + 1).padStart(2, '0')}`, 90 - index, 'evidence', 'Evidence'));

test('Choosing another skill updates real chart data, radio state and latest score, and resets an older page', () => {
  const card = mount([...analysis, ...evidence]);
  assert.match(card.find('progress-history-chart').accessibilityLabel, /10 Aug 2026: 27/);
  card.press('progress-history-older');
  assert.match(card.find('progress-history-chart').accessibilityLabel, /3 Aug 2026: 6/);
  card.press('progress-history-skill-selector');
  assert.equal(card.find('progress-history-skill-selector').accessibilityState.expanded, true);
  assert.equal(card.find('progress-history-skill-analysis').accessibilityState.checked, true);
  assert.equal(card.find('progress-history-skill-evidence').accessibilityState.checked, false);
  card.press('progress-history-skill-evidence');
  assert.equal(card.find('progress-history-skill-selector').accessibilityState.expanded, false);
  const label = card.find('progress-history-chart').accessibilityLabel;
  assert.match(label, /3 Sep 2026: 88/);
  assert.match(label, /9 Sep 2026: 82/);
  assert.doesNotMatch(label, /Aug/);
  assert.match(card.content(), /Latest score: 82 \/ 100/);
  assert.match(card.content(), /-6 points between/);
  assert.equal(card.find('progress-history-newer').disabled, true);
  card.press('progress-history-skill-selector');
  assert.equal(card.find('progress-history-skill-evidence').accessibilityState.checked, true);
});

test('Earlier and more recent controls display every page in order and disable at the boundaries', () => {
  const card = mount(analysis);
  assert.equal(card.find('progress-history-newer').disabled, true);
  card.press('progress-history-older');
  assert.match(card.find('progress-history-chart').accessibilityLabel, /3 Aug 2026: 6.*9 Aug 2026: 24/);
  card.press('progress-history-older');
  assert.match(card.find('progress-history-chart').accessibilityLabel, /1 Aug 2026: 0.*2 Aug 2026: 3/);
  assert.equal(card.find('progress-history-older').disabled, true);
  assert.match(card.content(), /Page 1 of 3/);
  card.press('progress-history-newer');
  assert.match(card.find('progress-history-chart').accessibilityLabel, /3 Aug 2026: 6.*9 Aug 2026: 24/);
  card.press('progress-history-newer');
  assert.match(card.find('progress-history-chart').accessibilityLabel, /10 Aug 2026: 27.*16 Aug 2026: 45/);
  assert.equal(card.find('progress-history-newer').disabled, true);
  assert.match(card.content(), /Page 3 of 3/);
});

test('List toggle and large-text fallback preserve the chart’s exact dates and zero/decimal scores', () => {
  const card = mount([point('2026-09-01', 0), point('2026-09-03', 37.4)]);
  assert(card.has('progress-history-chart'));
  assert.match(card.find('progress-history-chart').accessibilityLabel, /1 Sep 2026: 0.*3 Sep 2026: 37.4/);
  card.press('progress-history-table');
  assert(!card.has('progress-history-chart'));
  assert(card.has('progress-history-score-list'));
  assert(card.nodes().some(node => node.props.accessibilityLabel === '1 Sep 2026: 0 out of 100.'));
  assert(card.nodes().some(node => node.props.accessibilityLabel === '3 Sep 2026: 37.4 out of 100.'));
  card.press('progress-history-table');
  assert(card.has('progress-history-chart'));
  card.resize({ fontScale: 1.6 });
  assert(card.has('progress-history-score-list'));
  assert(!card.has('progress-history-chart'));
  assert(!card.has('progress-history-table'));
  assert(card.nodes().some(node => node.props.accessibilityLabel === '3 Sep 2026: 37.4 out of 100.'));
  card.resize({ fontScale: 1, width: 320 });
  assert(card.has('progress-history-score-list'));
});

test('An empty history, one zero-score date and two unchanged zero-score dates show distinct truthful states', () => {
  const empty = mount([]);
  assert.match(empty.content(), /No recorded days are available yet/);
  assert(!empty.has('progress-history-chart'));
  assert(!empty.has('progress-history-score-list'));
  const single = mount([point('2026-09-01', 0)]);
  assert(single.has('progress-history-score-list'));
  assert.match(single.content(), /One recorded day so far/);
  assert.match(single.content(), /Latest score: 0 \/ 100/);
  assert(!single.has('progress-history-chart'));
  const unchanged = mount([point('2026-09-01', 0), point('2026-09-02', 0)]);
  assert(unchanged.has('progress-history-chart'));
  assert.match(unchanged.content(), /Same score at the first and last recorded date shown/);
  assert.match(unchanged.find('progress-history-chart').accessibilityLabel, /1 Sep 2026: 0.*2 Sep 2026: 0/);
});
