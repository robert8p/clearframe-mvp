import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(relative)=>fs.readFileSync(path.join(root,relative),"utf8");
const failures=[];
const pass=(condition,message)=>{if(!condition)failures.push(message)};

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{const full=path.join(dir,entry.name);if(entry.isDirectory()){if(["node_modules",".next",".expo",".git"].includes(entry.name))return[];return walk(full)}return[full]})}

const audience=read("lib/audience.ts");
const context=read("lib/context-profile.ts");
const selector=read("components/AudienceSelector.tsx");
const form=read("components/ContextProfileForm.tsx");
const audiencePage=read("app/(product)/onboarding/audience/page.tsx");
const contextPage=read("app/(product)/onboarding/context/page.tsx");
const mobileAudience=read("mobile/lib/audience.ts");
const mobileOnboarding=read("mobile/app/onboarding.tsx");
const mobileHome=read("mobile/app/(tabs)/home.tsx");
const mobileProfile=read("mobile/app/(tabs)/profile.tsx");
const research=read("CASUAL_LEARNER_RESEARCH.md");
const migrations=[
  "supabase/migrations/020_casual_audience_scaffold.sql",
  "supabase/migrations/021_casual_skill_templates.sql",
  "supabase/migrations/022_casual_scenario_bank.sql",
  "supabase/migrations/023_casual_diagnostics_and_capstone.sql",
  "supabase/migrations/024_casual_lessons_part_one.sql",
  "supabase/migrations/025_casual_lessons_part_two_and_validation.sql",
  "supabase/migrations/026_casual_answer_position_balance.sql",
].map(read).join("\n");

pass(audience.includes('slug:"casual"')&&audience.includes('complexityAnchor:50')&&audience.includes('questionCount:5'),"Web audience model must define casual at adaptive anchor 50 with five daily questions.");
pass(audience.includes('shortLabel:"Everyday learner"')&&audience.includes('sessionLabel:"Everyday practice"'),"Casual context needs clear learner-facing labels.");
pass(audience.includes('audience === "casual"'),"Audience transfer copy must include casual everyday use.");
pass(context.includes("const CASUAL_INTERESTS")&&context.includes("make_better_everyday_decisions")&&context.includes("build_lifelong_learning_habit"),"Casual context must include interest and goal personalisation.");
pass(context.includes('if (audience === "casual") return CASUAL_INTERESTS')&&context.includes('return "Interest area"'),"Casual profile must use interest areas rather than professional functions.");
pass(selector.includes("does not assume one group is smarter, more serious or more capable"),"Audience selector must state that context is not ability or seriousness.");
pass(form.includes('audience==="casual"')&&form.includes('"What would you like to get better at?"'),"Web context form must tailor fields for casual learners.");
pass(audiencePage.includes("What kind of learning context fits you?")&&!audiencePage.includes("current stage"),"Web onboarding must not frame casual as a career stage.");
pass(contextPage.includes("A few optional details"),"Web optional-context copy must work for casual's two-field profile.");
pass(mobileAudience.includes('slug: "casual"')&&mobileOnboarding.includes("MOBILE_AUDIENCES"),"Mobile must include casual through a shared audience model.");
pass(mobileOnboarding.includes('audience === "casual"')&&mobileOnboarding.includes('"Interest area"'),"Mobile onboarding must tailor casual fields.");
pass(mobileHome.includes("mobileAudienceMeta")&&mobileProfile.includes("mobileAudienceMeta"),"Mobile Home and Profile must use the shared audience model.");
pass(research.includes("not an ability tier")&&research.includes("Self-Directed Enthusiasts"),"Research record must preserve the definition and evidence behind the casual segment.");
pass(migrations.includes("8 practical everyday contexts × all 15 Cogni judgement skills"),"Migration set must build the full 120-question casual scenario bank.");
pass(migrations.includes("Casual audience expected 126 published challenges")&&migrations.includes("Casual audience expected 16 published lessons"),"Migration set must enforce content parity with existing audiences.");
pass(migrations.includes("single_n<>55")&&migrations.includes("multi_n<>18")&&migrations.includes("ranking_n<>19")&&migrations.includes("classification_n<>17")&&migrations.includes("triage_n<>17"),"Migration set must validate full interaction-format parity.");
pass(migrations.includes("Casual answer-position distribution is not balanced")&&migrations.includes("correct_answer=m.correct_answer")&&migrations.includes("error_patterns=m.error_patterns"),"Casual content must balance answer positions and remap grading metadata.");
pass(migrations.includes("drop table if exists private._cogni_v020_casual_generated")&&migrations.includes("drop function if exists private._cogni_casual_render"),"Casual migration must clean private build-only objects.");

const legacySlugs=["university_student","graduate_early_career","junior_professional","management","executive"];
for(const file of walk(root).filter((file)=>/\.(ts|tsx)$/.test(file))){
  const source=fs.readFileSync(file,"utf8");
  if(legacySlugs.every((slug)=>source.includes(slug))&&!source.includes("casual")){
    failures.push(`${path.relative(root,file)} appears to enumerate every legacy audience without casual.`);
  }
}

if(failures.length){console.error("Cogni audience audit failed:\n");for(const failure of failures)console.error(`- ${failure}`);process.exit(1)}
console.log("Cogni audience audit passed.");
console.log("✓ Research-backed casual definition");
console.log("✓ Web and mobile learning-context parity");
console.log("✓ Interest/goal personalisation");
console.log("✓ 126 challenges, 16 lessons, five formats and balanced answer positions encoded");
