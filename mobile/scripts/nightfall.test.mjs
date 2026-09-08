import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { test } from 'node:test';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Nightfall retains the native app and real learning routes',()=>{
  const {expo}=JSON.parse(read('app.json'));assert.equal(expo.version,'0.5.0');assert.equal(expo.android.package,'app.gocogni.cogni');
  const welcome=read('app/index.tsx');assert(welcome.includes('Sharpen how you think.'));assert(welcome.includes('router.push("/demo")'));assert(welcome.includes('router.push("/signup")'));assert(welcome.includes('router.push("/login")'));assert(welcome.includes('insets.top'));
});
test('Illustration is bundled, decorative and independent of learning content',()=>{
  const art=read('components/visuals.tsx');assert(art.includes('importantForAccessibility:"no-hide-descendants"'));assert(art.includes('pointerEvents: "none"'));assert(art.includes('require("../assets/approved-dreamscape.png")'));assert(!art.includes('https://'));assert(!art.includes('Math.random'));assert(!art.includes('Animated.loop'));
  const bytes=fs.readFileSync(new URL('../assets/approved-dreamscape.png',import.meta.url));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(bytes.length<100000);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'2ea4004cf994b9f82bba4b5179d71efe020464bb59bf6a2b0e5c47be08386ea9');
});
test('New skill tiles use real data and real navigation with scalable labels',()=>{
  const source=read('components/learning-surfaces.tsx');assert(source.includes('rows.filter(row=>skillDetails(row)?.slug)'));assert(source.includes('onOpen(skill.slug)'));assert(source.includes('fontScale>1.45'));assert(source.includes('fontScale>1.3?undefined:2'));assert(!source.includes('numberOfLines={1}'));
});
test('Redesign does not turn mockup statistics into product data',()=>{
  for(const name of ['app/(tabs)/home.tsx','app/(tabs)/progress.tsx','components/practice-tools.tsx']){const s=read(name);assert(!s.includes('Overall mastery'));assert(!s.includes('+12%'));assert(!s.includes('72%'));}
  assert(read('app/(tabs)/progress.tsx').includes('data.summary.averageScore'));assert(read('components/practice-tools.tsx').includes('week.count/week.goal'));
});
test('Practice still starts without a selected answer or confidence',()=>{
  const s=read('components/question-runner.tsx');assert(s.includes('useState<number|null>(null)'));assert(s.includes('(!challenge.confidence_required||confidence!==null)'));assert(s.includes('if(!ready||busy||result||submitLock.current)return;'));
});
test('Five accessible destinations and keyboard handling survive restyling',()=>{
  const s=read('app/(tabs)/_layout.tsx');for(const name of ['home','skills','train','progress','profile'])assert(s.includes(`name="${name}"`));assert(s.includes('tabBarHideOnKeyboard: true'));assert(s.includes('useSafeAreaInsets'));
});

test("Welcome artwork uses the bundled concept art with a controlled atmospheric overlay",()=>{
  const art=read("components/visuals.tsx");
  const welcome=art.split("export function WelcomeArtwork()")[1].split("export type MotifKind")[0];
  assert(welcome.includes("<HeroArtwork"));
  assert(welcome.includes("<LinearGradient"));
  assert(art.includes('require("../assets/approved-dreamscape.png")'));
  assert(!art.includes("https://"));
});
