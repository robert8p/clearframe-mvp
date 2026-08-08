import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import {
  calibrationLabel,
  evidenceConfidence,
  focusPath,
  patternCopy,
  profilePatternNarrative,
  strongestSkill,
  weakestSkill,
  type ErrorPatternCount,
  type MeasuredSkill,
} from "@/lib/insights";

function nestedSkillName(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined)?.name ?? "Skill";
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: unknown }).name ?? "Skill");
  return "Skill";
}

export default async function DiagnosticResultsPage() {
  const { user, supabase } = await requireUser();
  const diagnosticProgress = await getDiagnosticProgress(supabase, user.id);
  if (!diagnosticProgress.completedSessionKey) redirect("/diagnostic");

  const [{ data: scoreRows }, { data: diagnosticRows }] = await Promise.all([
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name)").eq("user_id", user.id).gt("attempts", 0).order("score"),
    supabase.from("user_responses").select("challenge_id,is_correct,score_fraction,confidence,error_pattern,created_at").eq("user_id", user.id).eq("session_key", diagnosticProgress.completedSessionKey).order("created_at"),
  ]);

  const skills: MeasuredSkill[] = (scoreRows ?? []).map((row: any) => ({ name: nestedSkillName(row.skills), score: Number(row.score), reliability: Number(row.reliability), attempts: Number(row.attempts) }));
  const strength = strongestSkill(skills);
  const priority = weakestSkill(skills);
  const confidence = evidenceConfidence(skills);
  const pathway = focusPath(skills, 3);
  const latestDiagnostic = diagnosticRows ?? [];
  const diagnosticPatternCounts = new Map<string, number>();
  for (const row of latestDiagnostic as any[]) {
    if (!row.error_pattern) continue;
    const key = String(row.error_pattern);
    diagnosticPatternCounts.set(key, (diagnosticPatternCounts.get(key) ?? 0) + 1);
  }
  const patterns: ErrorPatternCount[] = [...diagnosticPatternCounts.entries()].map(([pattern, count]) => ({ pattern, count })).sort((a, b) => b.count - a.count);
  const topPattern = patterns[0];
  const topPatternCopy = patternCopy(topPattern?.pattern);
  const score = latestDiagnostic.length ? Math.round(latestDiagnostic.reduce((sum: number, row: any) => sum + Number(row.score_fraction ?? (row.is_correct ? 1 : 0)), 0) / latestDiagnostic.length * 100) : 0;
  const confidenceValues = latestDiagnostic.map((row: any) => row.confidence).filter((value: unknown): value is number => typeof value === "number");
  const averageConfidence = confidenceValues.length ? Math.round(confidenceValues.reduce((sum: number, value: number) => sum + value, 0) / confidenceValues.length) : 0;

  return (
    <div className="cg-mobile-page cg-profile-results">
      <div className="cg-kicker">Starting check complete</div>
      <h1 className="cg-screen-title">Your starting profile</h1>
      <p className="cg-profile-intro">This profile is based on your answers. Cogni uses it to choose what to train next. It is not an IQ test or a ranking against other people.</p>

      <section className="cg-card cg-profile-hero">
        <div className="cg-profile-orbit" aria-hidden="true">◎</div>
        <div>
          <div className="cg-kicker">Strongest skill so far</div>
          <h2>{strength?.name ?? "More answers needed"}</h2>
          <p>{strength ? `Skill score ${Math.round(strength.score)}/100. This is your strongest measured area so far.` : "Complete more questions to establish your first skill score."}</p>
        </div>
      </section>

      <div className="cg-profile-facts">
        <div className="cg-profile-fact"><span>Best next skill to work on</span><strong>{priority?.name ?? "More answers needed"}</strong>{priority && <small>Skill score {Math.round(priority.score)}/100</small>}</div>
        <div className="cg-profile-fact"><span>Evidence level</span><strong>{confidence.label}</strong><small>{confidence.percent}% evidence built so far</small></div>
      </div>

      <section className="cg-card cg-pattern-card">
        <div className="cg-kicker">A pattern we noticed</div>
        <h2>{topPatternCopy?.label ?? "Still learning about you"}</h2>
        <p>{profilePatternNarrative(patterns, priority)}</p>
        {topPatternCopy && <div className="cg-pattern-action">Try this: {topPatternCopy.action}</div>}
      </section>

      <section className="cg-card cg-focus-path-card">
        <div className="cg-kicker">Focus for this week</div>
        <div className="cg-focus-path">
          {pathway.length ? pathway.map((name, index) => <div className="cg-focus-step" key={name}><span>{index + 1}</span><strong>{name}</strong></div>) : <p>Answer a few more questions so Cogni can choose your best next skills.</p>}
        </div>
      </section>

      <section className="cg-card cg-calibration-card">
        <div className="cg-kicker">Confidence check</div>
        <div className="cg-calibration-stats">
          <div><strong>{score}%</strong><small>Question score</small></div>
          <div><strong>{averageConfidence}%</strong><small>Average confidence</small></div>
        </div>
        <p>{latestDiagnostic.length ? calibrationLabel(score, averageConfidence) : "This becomes useful once we have both answers and confidence ratings."}</p>
      </section>

      <Link className="cg-button cg-full" href="/lesson">Start my training</Link>
      <Link className="cg-button secondary cg-full" href="/skills">Explore all skills</Link>
    </div>
  );
}
