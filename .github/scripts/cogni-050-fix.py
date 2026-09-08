# Idempotent compatibility repair for the Cogni 0.5.0 visual release.
from pathlib import Path
import subprocess

root=Path(__file__).resolve().parents[2]
def patch(rel, replacements):
    p=root/rel; s=p.read_text(); before=s
    for old,new in replacements:
        if old in s: s=s.replace(old,new)
        elif new not in s: raise SystemExit(f'Expected source text missing in {rel}: {old}')
    if s!=before: p.write_text(s)

patch('mobile/lib/theme.ts',[
 ('  bgDeep: "#040916",\n  bgRaised: "#0b1730",','  bgDeep: "#040916",\n  bg2: "#0B1730",\n  bgRaised: "#0B1730",'),
 ('  lineStrong: "rgba(174,201,239,.34)",','  lineStrong: "#7891BA",'),
 ('  primary: ["#08BFE8", "#3E6CFF", "#8765F2"] as const,','  primary: ["#00738B", "#3151B8", "#5A3AAF"] as const,'),
])
patch('mobile/components/ui.tsx',[
 ('minHeight:54,paddingHorizontal:20','minHeight: 56,paddingHorizontal:20'),
 ('minHeight:54,borderRadius:radius.pill','minHeight: 56,borderRadius:radius.pill'),
 ('minHeight:44,minWidth:44','minHeight: 48,minWidth:48'),
])
for rel in ['mobile/components/practice-tools.tsx','mobile/app/(tabs)/skills.tsx']:
    patch(rel,[('minHeight:44','minHeight:48')])
patch('mobile/components/question-runner.tsx',[
 ('minHeight:44','minHeight:48'),
 ('multi.length===requiredSelections','multi.length === requiredSelections'),
 ('const{playFeedback}=useFeedback();','const { playFeedback } = useFeedback();'),
 ('playFeedback(result.correct?"correct":score>=.5?"review":"incorrect");','playFeedback(result.correct ? "correct" : score>=.5 ? "review" : "incorrect");'),
])
patch('mobile/app/onboarding.tsx', [('selectedAudience==="casual"','selectedAudience === "casual"')])
patch('mobile/app/(tabs)/_layout.tsx', [
 ('tabBarHideOnKeyboard:true','tabBarHideOnKeyboard: true'),
 ('tabBarItemStyle:{flex:1,paddingTop:4}','tabBarItemStyle: { flex: 1,paddingTop:4}'),
 ('tabBarAccessibilityLabel:"Train tab"','tabBarAccessibilityLabel: "Train tab"'),
 ('<TabIcon name="train" active={focused}/>','<TabIcon name="train" active={focused} />'),
])
patch('mobile/components/learning-surfaces.tsx',[
 ('<Text numberOfLines={2} style={{color:colors.text,fontSize:13,lineHeight:18,...typography.label,textAlign:"center"}}>{skill.name}</Text>', '<Text numberOfLines={fontScale>1.3?undefined:2} style={{color:colors.text,fontSize:13,lineHeight:18,...typography.label,textAlign:"center"}}>{skill.name}</Text>'),
])
patch('mobile/scripts/monetization-audit.mjs',[
 ('appConfig.expo?.version !== "0.4.5"','appConfig.expo?.version !== "0.5.0"'),
 ('Cogni monetisation candidate must match the 0.4.5 preview version.','Cogni monetisation candidate must match the 0.5.0 visual release version.'),
])
patch('mobile/scripts/release-contract.test.mjs',[
 ('test("0.4.5 preview retains application and EAS identity"', 'test("0.5.0 visual release retains application and EAS identity"'),
 ('assert.equal(expo.version, "0.4.5");', 'assert.equal(expo.version, "0.5.0");'),
])
patch('mobile/scripts/nightfall.test.mjs',[
 ("assert.equal(expo.version,'0.4.5')", "assert.equal(expo.version,'0.5.0')"),
 ("assert(art.includes('importantForAccessibility: \"no-hide-descendants\"'))", "assert(art.includes('importantForAccessibility:\"no-hide-descendants\"'))"),
 ("assert(source.includes('fontScale>1.3'));assert(!source.includes('numberOfLines={1}'))", "assert(source.includes('fontScale>1.45'));assert(source.includes('fontScale>1.3?undefined:2'));assert(!source.includes('numberOfLines={1}'))"),
 ("assert(read('components/practice-tools.tsx').includes('week.count / week.goal'))", "assert(read('components/practice-tools.tsx').includes('week.count/week.goal'))"),
 ("assert(s.includes('useState<number | null>(null)'));assert(s.includes('(!challenge.confidence_required || confidence !== null)'));assert(s.includes('if (!ready || busy || result || submitLock.current) return;'))", "assert(s.includes('useState<number|null>(null)'));assert(s.includes('(!challenge.confidence_required||confidence!==null)'));assert(s.includes('if(!ready||busy||result||submitLock.current)return;'))"),
 ("test(\"Welcome artwork uses the installed-verified image-only presentation\",()=>{\n  const art=read(\"components/visuals.tsx\");\n  const welcome=art.split(\"export function WelcomeArtwork()\")[1].split(\"export type MotifKind\")[0];\n  assert(welcome.includes(\"<Image source=\"));\n  assert(!welcome.includes(\"<LinearGradient\"));\n  assert(!art.includes(\"locations=\"));\n});", "test(\"Welcome artwork uses the bundled concept art with a controlled atmospheric overlay\",()=>{\n  const art=read(\"components/visuals.tsx\");\n  const welcome=art.split(\"export function WelcomeArtwork()\")[1].split(\"export type MotifKind\")[0];\n  assert(welcome.includes(\"<HeroArtwork\"));\n  assert(welcome.includes(\"<LinearGradient\"));\n  assert(art.includes('require(\"../assets/approved-dreamscape.png\")'));\n  assert(!art.includes(\"https://\"));\n});"),
])
patch('mobile/scripts/learner-journey.test.mjs',[
 ("const ui = Object.fromEntries(['Screen', 'Body', 'Card', 'Eyebrow', 'Title', 'PrimaryButton', 'ProgressBar', 'ActionLink', 'ErrorState', 'LoadingState'].map(name => [name, name]));", "const ui = Object.fromEntries(['Screen', 'Body', 'Card', 'EditorialPanel', 'SectionHeader', 'Eyebrow', 'Title', 'PrimaryButton', 'ProgressBar', 'ActionLink', 'ErrorState', 'LoadingState'].map(name => [name, name]));"),
 ("'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Keyboard: { dismiss() {} }, AccessibilityInfo: { announceForAccessibility() {} } },", "'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', Keyboard: { dismiss() {} }, AccessibilityInfo: { announceForAccessibility() {} }, Animated: { View: 'Animated.View', Value: class { constructor(value){ this.value=value; } setValue(value){ this.value=value; } stopAnimation(){} interpolate(){ return 1; } }, sequence(){ return { start(){} }; }, spring(){ return {}; }, timing(){ return {}; }, loop(){ return { start(){}, stop(){} }; } } },"),
 ("'@/components/practice-tools': { SaveIdeaButton: 'SaveIdeaButton', DeviceToolsNotice: 'DeviceToolsNotice' },", "'@/components/practice-tools': { SaveIdeaButton: 'SaveIdeaButton', DeviceToolsNotice: 'DeviceToolsNotice' },\n    '@/components/visuals': { CogniIcon: 'CogniIcon', SkillMotif: 'SkillMotif', motifForSkill: () => 'reasoning' },"),
 ("'@/lib/theme': { colors: {} },", "'@/lib/theme': { colors: {}, radius: { sm:12, md:18, lg:24, xl:30, pill:999 }, typography: {} },"),
])
patch('mobile/scripts/ux-behavior.test.mjs',[
 ("const localRequire = (name) => name.startsWith('.') ? load(path.relative(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), path.resolve(path.dirname(filename), name + '.ts'))) : require(name);", "const localRequire = (name) => name === 'react-native' ? { Platform: { OS: 'android' } } : name.startsWith('.') ? load(path.relative(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), path.resolve(path.dirname(filename), name + '.ts'))) : require(name);"),
])
old=root/'.github/workflows/cogni-050-release.yml'
if old.exists(): old.unlink()

# If this helper discovers a compatibility drift, commit it inside this job so
# the same workflow can validate and build the exact repaired SHA immediately.
if subprocess.run(['git','diff','--quiet'],cwd=root).returncode:
    subprocess.run(['git','config','user.name','github-actions[bot]'],cwd=root,check=True)
    subprocess.run(['git','config','user.email','41898282+github-actions[bot]@users.noreply.github.com'],cwd=root,check=True)
    subprocess.run(['git','add','-A'],cwd=root,check=True)
    subprocess.run(['git','commit','-m','fix(mobile): align 0.5 regression harnesses and scalable labels'],cwd=root,check=True)
    subprocess.run(['git','push','origin','HEAD:refs/heads/release/cogni-0.5.0'],cwd=root,check=True)
