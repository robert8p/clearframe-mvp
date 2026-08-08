import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { localDateKey } from "@/lib/dates";

function skillInfo(value: any) { return Array.isArray(value) ? value[0] : value; }

export default async function ProgressPage() {
  const { user, supabase } = await requireUser();
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: responses }, { data: scores }] = await Promise.all([
    supabase.from("user_responses").select("is_correct,score_fraction,confidence,response_time_ms,created_at").eq("user_id", user.id).gte("created_at", since).order("created_at"),
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).gt("attempts", 0).order("score", { ascending: false }).limit(4),
  ]);

  const rows = responses ?? [];
  const alignment = rows.length ? Math.round(rows.reduce((sum: number, row: any) => sum + Number(row.score_fraction ?? (row.is_correct ? 1 : 0)), 0) / rows.length * 100) : null;
  const confidenceValues = rows.map((row: any) => row.confidence).filter((value: unknown): value is number => typeof value === "number");
  const avgConfidence = confidenceValues.length ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) : null;
  const dayCounts = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date(Date.now() - (6 - offset) * 86400000);
    const key = localDateKey(d);
    return {
      label: d.toLocaleDateString("en-GB", { weekday: "narrow", timeZone: "Europe/London" }),
      fullLabel: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "Europe/London" }),
      count: rows.filter((row: { created_at: string }) => localDateKey(new Date(row.created_at)) === key).length,
    };
  });
  const maxCount = Math.max(1, ...dayCounts.map((day) => day.count));
  const summaryTitle = alignment === null ? "Your evidence starts here." : alignment >= 80 ? "Strong recent alignment." : alignment >= 60 ? "Useful momentum." : "Good evidence to train from.";
  const summaryCopy = alignment === null
    ? "Complete a lesson and challenge to start building your recent progress view."
    : `${rows.length} recent answer${rows.length === 1 ? "" : "s"}${avgConfidence === null ? "." : ` with average confidence of ${avgConfidence}%.`}`;

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Progress</div>
      <h1 className="cg-screen-title">Your progress</h1>

      <section className={`cg-card cg-progress-summary ${alignment === null ? "empty" : ""}`}>
        <div className="cg-ring big" style={{ ["--progress" as string]: `${(alignment ?? 0) * 3.6}deg` }}><span>{alignment === null ? "—" : `${alignment}%`}</span></div>
        <div><h2>{summaryTitle}</h2><p>{summaryCopy}</p></div>
      </section>

      <section className="cg-card">
        <div className="cg-section-head flush"><h2>Weekly activity</h2><span className="cg-pill">{rows.length} answers</span></div>
        <div className="cg-week-bars" aria-label="Answers completed over the last seven days">
          {dayCounts.map((day, index) => <div className="cg-week-col" key={index} title={`${day.fullLabel}: ${day.count} answers`}><div className="cg-week-track"><span style={{ height: `${day.count ? Math.max(8, day.count / maxCount * 100) : 0}%` }} /></div><small>{day.label}</small></div>)}
        </div>
      </section>

      <section className="cg-section-head"><h2>Strongest measured skills</h2><Link href="/skills">See all</Link></section>
      <div className="cg-master-list">
        {(scores ?? []).length ? (scores ?? []).map((row: any, index: number) => {
          const skill = skillInfo(row.skills);
          return <Link href={skill?.slug ? `/skills/${skill.slug}` : "/skills"} className="cg-master-row" key={skill?.slug ?? index}><div className="cg-course-icon">{index + 1}</div><div className="cg-course-copy"><strong>{skill?.name ?? "Skill"}</strong><div className="progress"><span style={{ width: `${Math.round(row.score)}%` }} /></div><small>{Math.round((row.reliability ?? 0) * 100)}% evidence confidence</small></div><span>{Math.round(row.score)}% ›</span></Link>;
        }) : <section className="cg-card"><p>No measured skills yet. Complete your diagnostic to establish the first evidence.</p><Link href="/diagnostic" className="cg-button cg-full">Open diagnostic</Link></section>}
      </div>
    </div>
  );
}
