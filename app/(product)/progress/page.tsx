import Link from "next/link";
import { requireUser } from "@/lib/auth";

function skillName(value: any) { return Array.isArray(value) ? value[0]?.name : value?.name; }

export default async function ProgressPage() {
  const { user, supabase } = await requireUser();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: responses }, { data: scores }] = await Promise.all([
    supabase.from("user_responses").select("is_correct,confidence,response_time_ms,created_at").eq("user_id", user.id).gte("created_at", since).order("created_at"),
    supabase.from("user_skill_scores").select("score,attempts,skills(name)").eq("user_id", user.id).gt("attempts", 0).order("score", { ascending: false }).limit(4),
  ]);

  const rows = responses ?? [];
  const accuracy = rows.length ? Math.round(rows.filter((x: { is_correct: boolean }) => x.is_correct).length / rows.length * 100) : 0;
  const avgConfidence = rows.length ? Math.round(rows.reduce((a: number, b: { confidence: number | null }) => a + (b.confidence ?? 0), 0) / rows.length) : 0;
  const dayCounts = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date(Date.now() - (6 - offset) * 86400000);
    const key = d.toISOString().slice(0,10);
    return { label: d.toLocaleDateString("en-GB", { weekday: "narrow" }), count: rows.filter((r: { created_at: string }) => r.created_at.slice(0,10) === key).length };
  });
  const maxCount = Math.max(1, ...dayCounts.map((d) => d.count));

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Progress</div>
      <h1 className="cg-screen-title">Your progress</h1>

      <section className="cg-card cg-progress-summary">
        <div className="cg-ring big" style={{ ['--progress' as string]: `${accuracy * 3.6}deg` }}><span>{accuracy}%</span></div>
        <div><h2>You’re doing great.</h2><p>Recent accuracy with average confidence of {avgConfidence}%.</p></div>
      </section>

      <section className="cg-card">
        <div className="cg-section-head flush"><h2>Weekly activity</h2></div>
        <div className="cg-week-bars">
          {dayCounts.map((day, i) => <div className="cg-week-col" key={i}><div className="cg-week-track"><span style={{ height: `${Math.max(8, day.count / maxCount * 100)}%` }} /></div><small>{day.label}</small></div>)}
        </div>
      </section>

      <section className="cg-section-head"><h2>Topics mastered</h2><Link href="/skills">See all</Link></section>
      <div className="cg-master-list">
        {(scores ?? []).map((row: any, i: number) => <div className="cg-master-row" key={i}><div className="cg-course-icon">{i + 1}</div><div className="cg-course-copy"><strong>{skillName(row.skills)}</strong><div className="progress"><span style={{ width: `${Math.round(row.score)}%` }} /></div></div><span>{Math.round(row.score)}%</span></div>)}
      </div>
    </div>
  );
}
