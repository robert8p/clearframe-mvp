import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CoachCard } from "@/components/CoachCard";
import { localDateKey } from "@/lib/dates";
import { audienceHomePromise, audienceMeta, audienceQuestionCount, isAudienceSegment } from "@/lib/audience";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import { contextProfileFromRow, contextSummary } from "@/lib/context-profile";

function skillInfo(value: unknown) {
  if (Array.isArray(value)) return value[0] as { name?: string; slug?: string } | undefined;
  return value as { name?: string; slug?: string } | undefined;
}

type ScoreRow = {
  score: number;
  reliability: number;
  attempts: number;
  skills: unknown;
};

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();
  const day = localDateKey();
  const [{ data: profile }, { data: scoreData }, { data: todaySession }, { data: lessonCompletion }] = await Promise.all([
    supabase.from("profiles").select("full_name,xp,current_streak,audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale").eq("id", user.id).single(),
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).gt("attempts", 0).order("score"),
    supabase.from("training_sessions").select("id,status,lesson_id").eq("user_id", user.id).eq("session_date", day).maybeSingle(),
    supabase.from("user_lesson_completions").select("id").eq("user_id", user.id).eq("lesson_date", day).maybeSingle(),
  ]);

  if (!isAudienceSegment(profile?.audience_segment)) redirect("/onboarding/audience");
  const diagnostic = await getDiagnosticProgress(supabase, user.id);
  if (!diagnostic.completedSessionKey) redirect("/onboarding");

  const audience = profile.audience_segment;
  const meta = audienceMeta(audience);
  const context = contextProfileFromRow(profile);
  const contextLine = contextSummary(audience, context);
  const scores = (scoreData ?? []) as ScoreRow[];

  let assigned: number = audienceQuestionCount(audience);
  let answered = 0;
  if (todaySession?.id) {
    const [{ count: assignedCount }, { count: answeredCount }] = await Promise.all([
      supabase.from("training_session_challenges").select("*", { count: "exact", head: true }).eq("session_id", todaySession.id),
      supabase.from("user_responses").select("*", { count: "exact", head: true }).eq("session_key", todaySession.id),
    ]);
    assigned = assignedCount ?? assigned;
    answered = answeredCount ?? 0;
  }

  const lessonDone = Boolean(lessonCompletion);
  const dailyUnits = assigned + 1;
  const dailyComplete = todaySession?.status === "completed";
  const dailyProgress = dailyComplete ? 100 : Math.min(100, Math.round(((answered + (lessonDone ? 1 : 0)) / dailyUnits) * 100));
  const continueHref = dailyComplete ? "/session-complete" : lessonDone ? "/training" : "/lesson";
  const remaining = Math.max(assigned - answered, 0);
  const weakest = scores[0];
  const weakestSkill = skillInfo(weakest?.skills);
  const extraTrainingHref = weakestSkill?.slug ? `/practice/${weakestSkill.slug}` : "/skills";
  const recentSkills = scores.slice(0, 3);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  const launchTitle = !lessonDone
    ? "Start today’s training"
    : answered > 0
      ? `Continue — ${remaining} question${remaining === 1 ? "" : "s"} left`
      : "Your questions are ready";
  const launchCopy = !lessonDone
    ? `Begin with a short ${meta?.shortLabel?.toLowerCase() ?? "personalised"} insight, then apply it straight away.`
    : `${answered} of ${assigned} questions complete. Pick up exactly where you left off.`;
  const launchLabel = !lessonDone ? "Start today’s training" : "Continue training";

  return <div className="cg-mobile-page">
    <header className="cg-mobile-header">
      <div>
        <h1>Hello, {firstName} 👋</h1>
        <p>{audienceHomePromise(audience)}</p>
        <Link href="/settings#learning-context" className="cg-context-pill">{meta?.icon} {meta?.label}</Link>
        {contextLine && <Link href="/settings#personalisation" className="cg-context-strip">{contextLine}</Link>}
      </div>
      <span className="cg-streak" aria-label={`${profile?.current_streak ?? 0} day streak`}>🔥 {profile?.current_streak ?? 0} day{Number(profile?.current_streak ?? 0) === 1 ? "" : "s"}</span>
    </header>

    {!dailyComplete ? <Link href={continueHref} className="cg-card cg-daily-card cg-daily-launch" aria-label={launchLabel}>
      <div className="cg-daily-launch-head"><div className="cg-kicker">Today’s training</div><span>About 5 min</span></div>
      <div className="cg-goal-row">
        <div className="cg-ring" style={{ ["--progress" as string]: `${dailyProgress * 3.6}deg` }}><span>{dailyProgress}%</span></div>
        <div><h2>{launchTitle}</h2><p>{launchCopy}</p></div>
      </div>
      <div className="progress" aria-label={`${dailyProgress}% complete`}><span style={{ width: `${dailyProgress}%` }} /></div>
      <div className="cg-launch-cta"><span>{launchLabel}</span><strong>→</strong></div>
      <small className="cg-tap-hint">Tap anywhere on this card</small>
    </Link> : <section className="cg-card cg-daily-card cg-daily-complete">
      <div className="cg-daily-launch-head"><div className="cg-kicker">Today’s training</div><span>Complete ✓</span></div>
      <div className="cg-goal-row">
        <div className="cg-ring" style={{ ["--progress" as string]: "360deg" }}><span>100%</span></div>
        <div><h2>Daily goal complete</h2><p>Nice work. Train another skill or review today’s answers.</p></div>
      </div>
      <div className="progress"><span style={{ width: "100%" }} /></div>
      <div className="cg-daily-actions"><Link href="/train" className="cg-button">Train more</Link><Link href="/session-complete" className="cg-button secondary">Review answers</Link></div>
    </section>}

    <section className="cg-section-head"><h2>Skills to work on next</h2><Link href="/skills">See all skills →</Link></section>
    <div className="cg-topic-grid">
      {recentSkills.map((row, index) => {
        const skill = skillInfo(row.skills);
        return <Link href={skill?.slug ? `/skills/${skill.slug}` : "/skills"} className="cg-topic-card cg-action-tile" key={skill?.slug ?? index}>
          <div className="cg-topic-card-top"><div className="cg-topic-icon">{index + 1}</div><span className="cg-action-arrow">→</span></div>
          <strong>{skill?.name ?? "Skill"}</strong>
          <span>{Math.round(row.score)}/100 · Practise</span>
        </Link>;
      })}
    </div>

    <CoachCard />

    <section className="cg-card cg-focus-card">
      <div className="cg-kicker">Best next skill to work on</div>
      <h2>{weakestSkill?.name ?? "Keep practising"}</h2>
      <p>{weakest ? `Current skill score ${Math.round(weakest.score)}/100. Evidence level ${Math.round((weakest.reliability ?? 0) * 100)}%.` : "Cogni will make this recommendation clearer as you answer more questions."}</p>
      <Link href={dailyComplete ? extraTrainingHref : continueHref} className="cg-button cg-full">{dailyComplete ? "Practise this skill" : launchLabel}</Link>
    </section>
  </div>;
}
