import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { CoachCard } from "@/components/CoachCard";
import { localDateKey } from "@/lib/dates";
import { audienceMeta, isAudienceSegment } from "@/lib/audience";
import { getDiagnosticProgress } from "@/lib/diagnostic";

function skillInfo(value: unknown) {
  if (Array.isArray(value)) return value[0] as { name?: string; slug?: string } | undefined;
  return value as { name?: string; slug?: string } | undefined;
}

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();
  const day = localDateKey();
  const [{ data: profile }, { data: scores }, { data: todaySession }, { data: lessonCompletion }] = await Promise.all([
    supabase.from("profiles").select("full_name,xp,current_streak,audience_segment").eq("id", user.id).single(),
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).gt("attempts", 0).order("score"),
    supabase.from("training_sessions").select("id,status,lesson_id").eq("user_id", user.id).eq("session_date", day).maybeSingle(),
    supabase.from("user_lesson_completions").select("id").eq("user_id", user.id).eq("lesson_date", day).maybeSingle(),
  ]);

  if (!isAudienceSegment(profile?.audience_segment)) redirect("/onboarding/audience");
  const diagnostic = await getDiagnosticProgress(supabase, user.id);
  if (!diagnostic.completedSessionKey) redirect("/onboarding");
  const audience = audienceMeta(profile.audience_segment);

  let assigned = 5, answered = 0;
  if (todaySession?.id) {
    const [{ count: assignmentCount }, { count: answeredCount }] = await Promise.all([
      supabase.from("training_session_challenges").select("*", { count: "exact", head: true }).eq("session_id", todaySession.id),
      supabase.from("user_responses").select("*", { count: "exact", head: true }).eq("session_key", todaySession.id),
    ]);
    assigned = assignmentCount ?? 5;
    answered = answeredCount ?? 0;
  }

  const lessonDone = Boolean(lessonCompletion);
  const dailyUnits = assigned + 1;
  const dailyProgress = todaySession?.status === "completed" ? 100 : Math.min(100, Math.round(((answered + (lessonDone ? 1 : 0)) / dailyUnits) * 100));
  const continueHref = todaySession?.status === "completed" ? "/session-complete" : lessonDone ? "/training" : "/lesson";
  const weakest = scores?.[0];
  const recentSkills = (scores ?? []).slice(0, 3);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="cg-mobile-page">
      <header className="cg-mobile-header">
        <div>
          <h1>Hello, {firstName} 👋</h1>
          <p>Ready to sharpen your thinking today?</p>
          <Link href="/settings#learning-context" className="cg-context-pill">{audience?.icon} {audience?.label}</Link>
        </div>
        <span className="cg-streak" aria-label={`${profile?.current_streak ?? 0} day streak`}>🔥 {profile?.current_streak ?? 0}</span>
      </header>

      <section className="cg-card cg-daily-card">
        <div className="cg-kicker">Daily goal</div>
        <div className="cg-goal-row">
          <div className="cg-ring" style={{ ["--progress" as string]: `${dailyProgress * 3.6}deg` }}><span>{dailyProgress}%</span></div>
          <div><h2>{todaySession?.status === "completed" ? "Goal complete" : lessonDone ? "Lesson done — time to practise" : `A ${audience?.shortLabel ?? "personalised"} lesson is ready`}</h2><p>{lessonDone ? "✓ Lesson" : "1 lesson"} • {answered} / {assigned} questions</p></div>
        </div>
        <div className="progress" aria-label={`${dailyProgress}% of today's learning complete`}><span style={{ width: `${dailyProgress}%` }} /></div>
      </section>

      <section className="cg-section-head"><h2>Continue learning</h2><Link href={continueHref}>Open</Link></section>
      <Link href={continueHref} className="cg-course-card" aria-label="Open today's learning">
        <div className="cg-course-icon">{lessonDone ? "◎" : "✦"}</div>
        <div className="cg-course-copy"><strong>{todaySession?.status === "completed" ? "Today complete" : lessonDone ? "Daily judgement challenge" : "Today’s mini lesson"}</strong><span>{todaySession?.status === "completed" ? "Lesson + challenge complete" : lessonDone ? `${Math.max(assigned - answered, 0)} questions left` : `Built around ${audience?.label.toLowerCase()} decisions`}</span><div className="progress"><span style={{ width: `${dailyProgress}%` }} /></div></div>
        <div className="cg-play" aria-hidden="true">▶</div>
      </Link>

      <section className="cg-section-head"><h2>Priority skills</h2><Link href="/skills">View all</Link></section>
      <div className="cg-topic-grid">
        {recentSkills.map((row: any, index: number) => {
          const skill = skillInfo(row.skills);
          return (
            <Link href={skill?.slug ? `/skills/${skill.slug}` : "/skills"} className="cg-topic-card" key={skill?.slug ?? index}>
              <div className="cg-topic-icon">{index + 1}</div>
              <strong>{skill?.name ?? "Skill"}</strong>
              <span>{Math.round(row.score)}%</span>
            </Link>
          );
        })}
      </div>

      <CoachCard />

      <section className="cg-card cg-focus-card">
        <div className="cg-kicker">Highest-value focus</div>
        <h2>{skillInfo(weakest?.skills)?.name ?? "Keep building evidence"}</h2>
        <p>{weakest ? `Current Development Score ${Math.round(weakest.score)} with ${Math.round((weakest.reliability ?? 0) * 100)}% evidence confidence.` : "Cogni will refine your focus as more observed evidence accumulates."}</p>
        <Link href={continueHref} className="cg-button cg-full">{todaySession?.status === "completed" ? "Review today’s result" : !lessonDone ? "Start today’s lesson" : answered ? "Continue challenge" : "Start challenge"}</Link>
      </section>
    </div>
  );
}
