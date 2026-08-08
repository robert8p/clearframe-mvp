import { requireUser } from "@/lib/auth";
import { SkillsExplorer } from "@/components/SkillsExplorer";

export default async function SkillsPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).order("score", { ascending: false });

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Explore</div>
      <h1 className="cg-screen-title">Skills</h1>
      <p className="cg-page-intro">Open any skill to see what it means, how strong the evidence is, and what to practise next.</p>
      <SkillsExplorer rows={(data ?? []) as never[]} />
    </div>
  );
}
