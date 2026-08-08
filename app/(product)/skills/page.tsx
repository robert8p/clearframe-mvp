import { requireUser } from "@/lib/auth";
import { SkillBars } from "@/components/SkillBars";

export default async function SkillsPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).order("score", { ascending: false });
  const measured = (data ?? []).filter((row: any) => (row.attempts ?? 0) > 0);
  const unmeasured = (data ?? []).filter((row: any) => (row.attempts ?? 0) === 0);

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Explore</div>
      <h1 className="cg-screen-title">Skills</h1>
      <div className="cg-search-fake">⌕ Search skills...</div>
      <div className="badge-row"><span className="cg-pill active">Measured {measured.length}</span><span className="cg-pill">Unmeasured {unmeasured.length}</span><span className="cg-pill">AI-era skills</span></div>
      <section className="cg-section-head"><h2>Your capability areas</h2></section>
      <SkillBars rows={(data ?? []) as never[]} />
    </div>
  );
}
