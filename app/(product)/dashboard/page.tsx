import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CoachCard } from "@/components/CoachCard";
import { localDateKey } from "@/lib/dates";

function skillName(value: any) { return Array.isArray(value) ? value[0]?.name : value?.name; }

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();
  const day = localDateKey();
  const [{ data: profile }, { data: scores }, { data: todaySession }, { data: lessonCompletion }] = await Promise.all([
    supabase.from("profiles").select("full_name,xp,current_streak").eq("id", user.id).single(),
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name)").eq("user_id", user.id).gt("attempts", 0).order("score"),
    supabase.from("training_sessions").select("id,status,lesson_id").eq("user_id", user.id).eq("session_date", day).maybeSingle(),
    supabase.from("user_lesson_completions").select("id").eq("user_id", user.id).eq("lesson_date", day).maybeSingle(),
  ]);

  let assigned = 5, answered = 0;
  if (todaySession?.id) {
    const [{ count: assignmentCount }, { count: answeredCount }] = await Promise.all([
      supabase.from("training_session_challenges").select("*", { count: "exact", head: true }).eq("session_id", todaySession.id),
      supabase.from("user_responses").select("*", { count: "exact", head: true }).eq("session_key", todaySession.id),
    ]);
    assigned = assignmentCount ?? 5; answered = answeredCount ?? 0;
  }

  const lessonDone = Boolean(lessonCompletion);
  const dailyUnits = assigned + 1;
  const dailyProgress = todaySession?.status === "completed" ? 100 : Math.round(((answered + (lessonDone ? 1 : 0)) / dailyUnits) * 100);
  const continueHref = todaySession?.status === "completed" ? "/session-complete" : lessonDone ? "/training" : "/lesson";
  const weakest = scores?.[0];
  const recentSkills = (scores ?? []).slice(0, 3);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="cg-mobile-page">
      <header className="cg-mobile-header">
        <div><h1>Hello, {firstName} 👋</h1><p>Ready to sharpen your thinking today?</p></div>
        <span className="cg-streak">🔥 {profile?.current_streak ?? 0}</span>
      </header>

      <section className="cg-card cg-daily-card">
        <div className="cg-kicker">Daily goal</div>
        <div className="cg-goal-row">
          <div className="cg-ring" style={{ ['--progress' as string]: `${dailyProgress * 3.6}deg` }}><span>{dailyProgress}%</span></div>
          <div><h2>{todaySession?.status === "completed" ? "Goal complete" : lessonDone ? "Lesson done — time to practise" : "Start with today’s 3-min lesson"}</h2><p>{lessonDone ? "✓ Lesson" : "1 lesson"} • {answered} / {assigned} questions</p></div>
        </div>
        <div className="progress"><span style={{ width: `${dailyProgress}%` }} /></div>
      </section>

      <section className="cg-section-head"><h2>Continue learning</h2><Link href={continueHref}>See all</Link></section>
      <Link href={continueHref} className="cg-course-card">
        <div className="cg-course-icon">{lessonDone ? "◎" : "✦"}</div>
        <div className="cg-course-copy"><strong>{todaySession?.status === "completed" ? "Today complete" : lessonDone ? "Daily judgement challenge" : "Today’s mini lesson"}</strong><span>{todaySession?.status === "completed" ? "Lesson + challenge complete" : lessonDone ? `${Math.max(assigned - answered, 0)} questions left` : "3 fun minutes, then 5 mixed-format questions"}</span><div className="progress"><span style={{ width: `${dailyProgress}%` }} /></div></div>
        <div className="cg-play">▶</div>
      </Link>

      <section className="cg-section-head"><h2>Priority skills</h2><Link href="/skills">View all</Link></section>
      <div className="cg-topic-grid">
        {recentSkills.map((row: any, index: number) => (
          <Link href="/skills" className="cg-topic-card" key={index}>
            <div className="cg-topic-icon">{index + 1}</div>
            <strong>{skillName(row.skills)}</strong>
            <span>{Math.round(row.score)}%</span>
          </Link>
        ))}
      </div>

      <CoachCard />

      <section className="cg-card cg-focus-card">
        <div className="cg-kicker">Highest-value focus</div>
        <h2>{skillName(weakest?.skills) ?? "Complete your diagnostic"}</h2>
        <p>{weakest ? `Current score ${Math.round(weakest.score)} with ${Math.round((weakest.reliability ?? 0) * 100)}% evidence confidence.` : "Cogni needs measured evidence before personalising your focus."}</p>
        <Link href={continueHref} className="cg-button cg-full">{todaySession?.status === "completed" ? "Review today’s result" : !lessonDone ? "Start today’s lesson" : answered ? "Continue challenge" : "Start challenge"}</Link>
      </section>
    </div>
  );
}
