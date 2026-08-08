import { requireUser } from "@/lib/auth";
import { SkillBars } from "@/components/SkillBars";

export default async function SkillsPage() {
  const { user, supabase } = await requireUser();
  const { data } = await supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).order("score");

  const measuredCount = (data ?? []).filter((row: any) => (row.attempts ?? 0) > 0).length;

  return (
    <>
      <div className="cg-kicker">Skills</div>
      <h1>Your judgement profile</h1>
      <p>Measured skills show evidence-backed development scores. Unassessed skills are kept separate rather than mislabelled as weaknesses.</p>

      <div className="cg-grid three" style={{ marginTop: 18 }}>
        <section className="cg-card"><div className="cg-kicker">Measured</div><div className="cg-stat">{measuredCount}</div><p>Capabilities with actual observed evidence.</p></section>
        <section className="cg-card"><div className="cg-kicker">Not yet measured</div><div className="cg-stat">{Math.max((data ?? []).length - measuredCount, 0)}</div><p>These will be explored over time.</p></section>
        <section className="cg-card"><div className="cg-kicker">Read this correctly</div><p>This profile is directional and developmental, not a permanent identity label.</p></section>
      </div>

      <div style={{ marginTop: 18 }}><SkillBars rows={(data ?? []) as never[]} /></div>
    </>
  );
}
