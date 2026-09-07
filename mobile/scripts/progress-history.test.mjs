import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/learning-view.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', output)(module, module.exports);
const { historySeries, historyTrends, historyChange, historyPage, historyDateLabel } = module.exports;
const point = (date, score, extra = {}) => ({ date, score, skillId: 'evidence', skillName: 'Evidence', reliability: 0.4, attempts: 3, skillSlug: 'evidence', ...extra });

test('Empty history and one genuine zero measurement have different states', () => {
  assert.deepEqual(historySeries([]), []);
  const series = historySeries([point('2026-09-01', 0)])[0];
  assert.equal(series.points[0].score, 0);
  assert.equal(series.observations, 1);
  assert.equal(historyChange(series.points), null);
  assert.deepEqual(historyTrends(series.points), []);
  assert.deepEqual(historyChange([point('2026-09-01', 0), point('2026-09-02', 0)]), { from: 0, to: 0, delta: 0 });
});

test('Every available skill remains selectable, including single-day skills', () => {
  const points = Array.from({ length: 12 }, (_, index) => [
    point('2026-09-01', index, { skillId: `skill-${index}`, skillName: `Skill ${String(index).padStart(2, '0')}` }),
    point('2026-09-02', index + 2, { skillId: `skill-${index}`, skillName: `Skill ${String(index).padStart(2, '0')}` }),
  ]).flat();
  points.push(point('2026-09-02', 30, { skillId: 'single', skillName: 'A single day' }));
  assert.equal(historySeries(points).length, 13);
  assert.equal(historySeries(points)[0].skillId, 'single');
  assert.equal(historyTrends(points).length, 12);
  assert.equal(historyTrends(points)[11].skillId, 'skill-11');
});

test('Duplicate days use cumulative observation order, independent of input order', () => {
  const rows = [point('2026-09-02', 70, { attempts: 8 }), point('2026-09-01', 20), point('2026-09-02', 10, { attempts: 4 })];
  const original = JSON.stringify(rows);
  assert.deepEqual(historySeries(rows), historySeries([...rows].reverse()));
  assert.equal(historyTrends(rows)[0].delta, 50);
  assert.equal(historyTrends(rows)[0].observations, 2);
  assert.equal(JSON.stringify(rows), original);
});

test('Exact duplicates do not add evidence; unresolved conflicting snapshots do not invent a change', () => {
  const rows = [point('2026-09-01', 50), point('2026-09-01', 50), point('2026-09-02', 60)];
  assert.equal(historyTrends(rows)[0].observations, 2);
  const ambiguous = [...rows, point('2026-09-02', 80)];
  assert.deepEqual(historySeries(ambiguous), historySeries([...ambiguous].reverse()));
  assert.equal(historySeries(ambiguous)[0].observations, 1);
  assert.equal(historyTrends(ambiguous).length, 0);
});

test('Malformed dates and missing or unmeasured scores cannot become recorded zeroes', () => {
  const rows = [point('2026-02-30', 30), point('2026-13-01', 30), point('2026-09-01junk', 30),
    point('2026-09-01', null), point('2026-09-01', ''), point('2026-09-01', NaN),
    point('2026-09-01', Infinity), point('2026-09-01', -1), point('2026-09-01', 101),
    point('2026-09-01', 50, { attempts: 0 }), point('2026-09-01', 50, { attempts: 1.5 })];
  assert.deepEqual(historySeries(rows), []);
  assert.equal(historySeries([point('2024-02-29', 100)])[0].observations, 1);
  assert.deepEqual(historySeries([point('2026-02-29', 100)]), []);
});

test('History pagination exposes every recorded date once, without fabricating gaps', () => {
  const points = Array.from({ length: 16 }, (_, i) => point(`2026-08-${String(i * 2 + 1).padStart(2, '0')}`, i));
  const latest = historyPage(points);
  assert.equal(latest.points.length, 7);
  assert.equal(latest.pages, 3);
  assert.equal(latest.hasOlder, true);
  assert.equal(latest.hasNewer, false);
  assert.equal(historyPage(points, 2).points.length, 2);
  assert.deepEqual([2, 1, 0].flatMap(index => historyPage(points, index).points), points);
  assert.equal(historyPage(points, 999).page, 2);
  assert.equal(historyPage(points, -1).page, 0);
  assert.equal(historyPage(points, 1.5).page, 0);
  assert.deepEqual(historyPage([]).points, []);
  assert.equal(historyPage([], 999).page, 0);
  assert.equal(historyPage(points, 0, 0).points.length, 7);
});

test('Date labels preserve recorded UTC dates across daylight-saving and year boundaries', () => {
  assert.equal(historyDateLabel('2026-03-29'), '29 Mar 2026');
  assert.equal(historyDateLabel('2026-12-31'), '31 Dec 2026');
  assert.equal(historyDateLabel('2027-01-01', false), '1 Jan');
  assert.equal(historyDateLabel('2026-02-30'), 'Unknown date');
});

test('A negative change is kept signed and a decimal score stays exact in the series', () => {
  const series = historySeries([point('2026-09-02', 30.1), point('2026-09-01', 42.2)])[0];
  assert.equal(historyChange(series.points).delta, -12.1);
  assert.equal(series.points[1].score, 30.1);
});
