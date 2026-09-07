import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { test } from 'node:test';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Nightfall retains the native app and real learning routes',()=>{
  const {expo}=JSON.parse(read('app.json'));assert.equal(expo.version,'0.4.5');assert.equal(expo.android.package,'app.gocogni.cogni');
  const welcome=read('app/index.tsx');assert(welcome.includes('Sharpen how you think.'));assert(welcome.includes('router.push("/demo")'));assert(welcome.includes('router.push("/signup")'));assert(welcome.includes('router.push("/login")'));assert(welcome.includes('insets.top'));
});
test('Illustration is bundled, decorative and independent of learning content',()=>{
  const art=read('components/visuals.tsx');assert(art.includes('importantForAccessibility: "no-hide-descendants"'));assert(art.includes('pointerEvents: "none"'));assert(art.includes('require("../assets/approved-dreamscape.webp")'));assert(!art.includes('https://'));assert(!art.includes('Math.random'));assert(!art.includes('Animated.loop'));
  const bytes=fs.readFileSync(new URL('../assets/approved-dreamscape.webp',import.meta.url));assert.equal(bytes.subarray(8,12).toString(),'WEBP');assert(bytes.length<10000);
  assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),'c2e81a4e75327a1fbd8fee1427857ab428892baa');
});
test('New skill tiles use real data and real navigation with scalable labels',()=>{
  const source=read('components/learning-surfaces.tsx');assert(source.includes('rows.filter(row=>skillDetails(row)?.slug)'));assert(source.includes('onOpen(skill.slug)'));assert(source.includes('fontScale>1.3'));assert(!source.includes('numberOfLines={1}'));
});
test('Redesign does not turn mockup statistics into product data',()=>{
  for(const name of ['app/(tabs)/home.tsx','app/(tabs)/progress.tsx','components/practice-tools.tsx']){const s=read(name);assert(!s.includes('Overall mastery'));assert(!s.includes('+12%'));assert(!s.includes('72%'));}
  assert(read('app/(tabs)/progress.tsx').includes('data.summary.averageScore'));assert(read('components/practice-tools.tsx').includes('week.count / week.goal'));
});
test('Practice still starts without a selected answer or confidence',()=>{
  const s=read('components/question-runner.tsx');assert(s.includes('useState<number | null>(null)'));assert(s.includes('(!challenge.confidence_required || confidence !== null)'));assert(s.includes('if (!ready || busy || result || submitLock.current) return;'));
});
test('Five accessible destinations and keyboard handling survive restyling',()=>{
  const s=read('app/(tabs)/_layout.tsx');for(const name of ['home','skills','train','progress','profile'])assert(s.includes(`name="${name}"`));assert(s.includes('tabBarHideOnKeyboard: true'));assert(s.includes('useSafeAreaInsets'));
});
