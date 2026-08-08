import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { SessionCelebration } from "@/components/SessionCelebration";
import { SessionFeedback } from "@/components/SessionFeedback";
import { patternCopy, sessionInsight, type ErrorPatternCount } from "@/lib/insights";

type SkillMovement = { name: string; before: number | null; after: number; delta: number | null; touches: number };
type NestedSkill = { name?: string; slug?: string };
function nestedSkill(value: unknown): NestedSkill { if (Array.isArray(value)) return (value[0] as NestedSkill | undefined) ?? {}; if (value && typeof value === "object") return value as NestedSkill; return {}; }
function nestedSkillName(value: unknown) { return nestedSkill(value).name ?? "Skill"; }

export default async function SessionCompletePage() {
  const { user, supabase } = await requireUser();
  const [{ data: profile }, { data: session }, { data: scoreRows }] = await Promise.all([
    supabase.from("profiles").select("xp,current_streak").eq("id", user.id).single(),
    supabase.from("training_sessions").select("id,completed_at").eq("user_id", user.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("user_skill_scores").select("skill_id,score,skills(name,slug)").eq("user_id", user.id).gt("attempts", 0),
  ]);
  if (!session?.id) redirect("/dashboard");

  const { data: responseRows } = await supabase.from("user_responses").select("id,challenge_id,is_correct,score_fraction,confidence,error_pattern,xp_awarded,created_at").eq("user_id", user.id).eq("session_key", session.id).order("created_at");
  const responses = responseRows ?? [];
  let movements: SkillMovement[] = [];
  const responseIds = responses.map((row: any) => String(row.id));

  if (responseIds.length) {
    const { data: updateRows } = await supabase.from("user_response_skill_updates").select("skill_id,score_before,score_after,created_at,skills(name)").eq("user_id", user.id).in("response_id", responseIds).order("created_at");
    if (updateRows?.length) {
      const grouped = new Map<string, SkillMovement>();
      for (const row of updateRows as any[]) {
        const skillId = String(row.skill_id), existing = grouped.get(skillId), before = Number(row.score_before), after = Number(row.score_after);
        if (!existing) grouped.set(skillId, { name: nestedSkillName(row.skills), before, after, delta: Number((after - before).toFixed(1)), touches: 1 });
        else { existing.after = after; existing.delta = existing.before === null ? null : Number((after - existing.before).toFixed(1)); existing.touches += 1; }
      }
      movements = [...grouped.values()].sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0));
    } else {
      const challengeIds = responses.map((row: any) => String(row.challenge_id));
      const { data: mappingRows } = await supabase.from("challenge_skill_mapping").select("skill_id,skills(name)").in("challenge_id", challengeIds);
      const currentBySkill = new Map<string, number>();
      for (const row of scoreRows ?? []) currentBySkill.set(String((row as any).skill_id), Number((row as any).score));
      const seen = new Set<string>();
      movements = (mappingRows ?? []).filter((row: any) => { const id = String(row.skill_id); if (seen.has(id)) return false; seen.add(id); return true; }).map((row: any) => ({ name: nestedSkillName(row.skills), before: null, after: currentBySkill.get(String(row.skill_id)) ?? 50, delta: null, touches: 1 }));
    }
  }

  const total = responses.length;
  const fullyCorrect = responses.filter((row: any) => Boolean(row.is_correct)).length;
  const sessionScore = total ? Math.round(responses.reduce((sum: number, row: any) => sum + Number(row.score_fraction ?? (row.is_correct ? 1 : 0)), 0) / total * 100) : 0;
  const confidenceValues = responses.map((row: any) => row.confidence).filter((value: unknown): value is number => typeof value === "number");
  const averageConfidence = confidenceValues.length ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) : 0;
  const sessionXp = responses.reduce((sum: number, row: any) => sum + Number(row.xp_awarded ?? (row.is_correct ? 12 : 7)), 0);
  const patternMap = new Map<string, number>();
  for (const row of responses) if (row.error_pattern) patternMap.set(String(row.error_pattern), (patternMap.get(String(row.error_pattern)) ?? 0) + 1);
  const patterns: ErrorPatternCount[] = [...patternMap.entries()].map(([pattern, count]) => ({ pattern, count })).sort((a, b) => b.count - a.count);
  const focusSkill = movements[0]?.name ?? null;
  const insight = sessionInsight({ accuracy: sessionScore, averageConfidence, patterns, focusSkill });
  const completionTitle = sessionScore >= 80 ? "Excellent!" : sessionScore >= 60 ? "Strong session!" : "Session complete!";
  const weakestRow = [...(scoreRows ?? [])].sort((a: any, b: any) => Number(a.score) - Number(b.score))[0] as any;
  const weakestSkill = nestedSkill(weakestRow?.skills);
  const extraTrainingHref = weakestSkill.slug ? `/practice/${weakestSkill.slug}` : "/skills";

  return (
    <div className="cg-mobile-page cg-results-screen">
      <SessionCelebration xp={sessionXp} streak={profile?.current_streak ?? 0} title={completionTitle} />
      <p className="cg-results-scoreline">{fullyCorrect} fully correct • {sessionScore}% session score across all question types.</p>
      <div className="cg-result-stats"><div><small>Score</small><strong>{sessionScore}%</strong></div><div><small>Confidence</small><strong>{averageConfidence}%</strong></div><div><small>Streak</small><strong>{profile?.current_streak ?? 0}</strong></div></div>
      <section className="cg-card cg-personal-insight-card"><div className="cg-kicker">Your insight</div><h2>What this session suggests</h2><p>{insight}</p></section>
      <section className="cg-card"><div className="cg-section-head flush"><h2>Skills updated</h2><span className="cg-pill">{movements.length}</span></div><div className="cg-session-skill-list">{movements.length ? movements.slice(0, 5).map((movement) => <div className="cg-session-skill" key={movement.name}><div><strong>{movement.name}</strong><small>{movement.touches > 1 ? `${movement.touches} questions` : "1 question"}</small></div><div className="cg-session-skill-score"><strong>{Math.round(movement.after)}</strong>{movement.delta === null ? <span className="cg-delta neutral">practised</span> : <span className={`cg-delta ${movement.delta > 0 ? "up" : movement.delta < 0 ? "down" : "neutral"}`}>{movement.delta > 0 ? "+" : ""}{movement.delta.toFixed(1)}</span>}</div></div>) : <p>No skill change was recorded for this session.</p>}</div></section>
      <section className="cg-card"><div className="cg-section-head flush"><h2>What to learn from</h2><span className="cg-pill">{patterns.reduce((sum, item) => sum + item.count, 0)}</span></div>{patterns.length ? <div className="cg-pattern-list">{patterns.map((item) => { const copy = patternCopy(item.pattern); return <div className="cg-pattern-row" key={item.pattern}><div><strong>{copy?.label ?? item.pattern.replaceAll("_", " ")}</strong><small>{copy?.action}</small></div><span className="cg-pill">×{item.count}</span></div>; })}</div> : <div className="cg-clean-session"><strong>No repeated thinking mistake showed up.</strong><p>That does not mean the skill is mastered; it just means no clear repeated mistake appeared today.</p></div>}</section>
      <section className="cg-card cg-session-footer-card"><div><div className="cg-kicker">Total XP</div><strong>{profile?.xp ?? 0}</strong></div><div><div className="cg-kicker">Next skill</div><strong>{weakestSkill.name ?? focusSkill ?? "Keep practising"}</strong></div></section>
      <section className="cg-card cg-extra-training-card"><div className="cg-kicker">Want to keep going?</div><h2>Daily goal complete. Training stays open.</h2><p>{weakestSkill.name ? `Take 3 fresh questions focused on ${weakestSkill.name}.` : "Choose a skill and continue with fresh questions."} Extra practice is optional and still updates your skill scores.</p><Link href={extraTrainingHref} className="cg-button cg-full">Keep training</Link></section>
      <SessionFeedback />
      <div className="cg-results-actions"><Link href="/dashboard" className="cg-button cg-full">Back to Home</Link><Link href="/skills" className="cg-button secondary cg-full">Choose another skill</Link></div>
    </div>
  );
}
