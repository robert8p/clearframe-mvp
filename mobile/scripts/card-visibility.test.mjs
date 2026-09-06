import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';

test('Learning cards never hide content behind an animation lifecycle', () => {
  const source = fs.readFileSync(new URL('../components/ui.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('export function Card(');
  const end = source.indexOf('export function Eyebrow', start);
  assert(start >= 0 && end > start);
  const card = source.slice(start, end);
  assert(card.includes('<View style='));
  assert(!card.includes('<Animated.View'));
  assert(!/opacity\s*:/.test(card));
  assert(!card.includes('useReducedMotion()'));
});
