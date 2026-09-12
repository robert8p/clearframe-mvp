import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const compact=value=>value.replace(/\s+/g,'');
test('Connected Knowledge retains the native app and real learning routes',()=>{
  const {expo}=JSON.parse(read('app.json'));assert.equal(expo.version,'0.6.1');assert.equal(expo.android.package,'app.gocogni.cogni');
  const welcome=read('app/index.tsx');assert(welcome.includes('Sharpen how you think.'));assert(welcome.includes('router.push("/demo")'));assert(welcome.includes('router.push("/signup")'));assert(welcome.includes('router.push("/login")'));assert(welcome.includes('insets.top'));
});
test('Illustration is abstract, decorative and independent of learning content',()=>{
  const art=read('components/visuals.tsx');assert(art.includes('importantForAccessibility:"no-hide-descendants"'));assert(art.includes('pointerEvents:"none"'));assert(art.includes('CogniMark'));assert(art.includes('SkillMotif'));assert(!art.includes('approved-dreamscape'));assert(!art.includes('require('));assert(!art.includes('https://'));assert(!art.includes('Math.random'));assert(!art.includes('Animated.loop'));
});
test('New skill tiles use real data and real navigation with scalable labels',()=>{
  const source=compact(read('components/learning-surfaces.tsx'));assert(source.includes('rows.filter(row=>skillDetails(row)?.slug)'));assert(source.includes('onOpen(slug)'));assert(source.includes('fontScale>1.45'));assert(!source.includes('numberOfLines='));
});
test('Redesign does not turn mockup statistics into product data',()=>{
  for(const name of ['app/(tabs)/home.tsx','app/(tabs)/progress.tsx','components/practice-tools.tsx']){const s=read(name);assert(!s.includes('Overall mastery'));assert(!s.includes('+12%'));assert(!s.includes('72%'));}
  assert(read('app/(tabs)/progress.tsx').includes('data.summary.averageScore'));assert(read('components/practice-tools.tsx').includes('week.count/week.goal'));
});
test('Practice still starts without a selected answer or confidence',()=>{
  const s=compact(read('components/question-runner.tsx'));assert(s.includes('useState<number|null>(null)'));assert(s.includes('(!challenge.confidence_required||confidence!==null)'));assert(s.includes('if(!ready||busy||result||submitLock.current)return;'));
});
test('Five accessible destinations and keyboard handling survive restyling',()=>{
  const s=read('app/(tabs)/_layout.tsx');for(const name of ['home','skills','train','progress','profile'])assert(s.includes(`name="${name}"`));assert(s.includes('title: "Discover"'));assert(s.includes('tabBarAccessibilityLabel: "Discover tab"'));assert(s.includes('tabBarHideOnKeyboard: true'));assert(s.includes('useSafeAreaInsets'));
});

test("Achievements are backend-owned and exposed to the mobile UI",()=>{
  const types=read("lib/types.ts");
  const achievements=read("components/achievements.tsx");
  const profile=read("app/(tabs)/profile.tsx");
  const progress=read("app/(tabs)/progress.tsx");
  const engine=read("../supabase/functions/mobile-api/engine.ts");
  assert(types.includes("AchievementProgress"));
  assert(achievements.includes("AchievementShelf"));
  assert(profile.includes("data.achievements ?? []"));
  assert(progress.includes("data.achievements ?? []"));
  assert(engine.includes("ACHIEVEMENT_RULES"));
  assert(engine.includes("user_achievements"));
  assert(engine.includes("persistKnownAchievements"));
});

test("Welcome artwork uses abstract Cogni artwork with a controlled atmospheric overlay",()=>{
  const art=read("components/visuals.tsx");
  const welcome=art.split("export function WelcomeArtwork()")[1].split("export type MotifKind")[0];
  assert(welcome.includes("<HeroArtwork"));
  assert(welcome.includes("<LinearGradient"));
  assert(!art.includes("approved-dreamscape"));
  assert(!art.includes("https://"));
});

test("Global app backdrop never renders retired character artwork",()=>{
  const ui=read("components/ui.tsx");
  assert(!ui.includes("approved-dreamscape"));
  assert(!ui.includes("<Image"));
});
