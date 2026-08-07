import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CoachCard } from "@/components/CoachCard";

function getSkillName(value: any) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export default async function Dashboard() {
  const { user, supabase } = await requireUser();

  const [{ data: profile }, { data: scores }, { count: responses }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,xp,current_streak,last_session_date")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_skill_scores")
      .select("score,reliability,attempts,skills(name)")
      .eq("user_id", user.id)
      .gt("attempts", 0)
      .order("score"),
    supabase.from("user_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const measuredScores = scores ?? [];
  const weakest = measuredScores[0];
  const strongest = measuredScores[measuredScores.length - 1];
  const averageReliability = measuredScores.length
    ? Math.round(measuredScores.reduce((sum, row) => sum + (row.reliability ?? 0), 0) / measuredScores.length * 100)
    : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="kicker">Today</div>
          <h1>
            {profile?.full_name ? `Good morning, ${profile.full_name.split(" ")[0]}` : "Build better judgement"}
          </h1>
          <p className="muted" style={{ maxWidth: 700 }}>
            Cogni helps you strengthen the human skills AI cannot replace: reasoning, verification, problem framing and decision quality.
          </p>
        </div>
        <Link className="button" href={responses ? "/training" : "/onboarding"}>
          {responses ? "Start today’s session" : "Take diagnostic"}
        </Link>
      </div>

      <section className="card hero-card">
        <div className="grid grid-3">
          <div className="stat-card">
            <div className="kicker">Current streak</div>
            <div className="stat">{profile?.current_streak ?? 0}</div>
            <p className="muted">Consistency compounds.</p>
          </div>
          <div className="stat-card">
            <div className="kicker">Total XP</div>
            <div className="stat">{profile?.xp ?? 0}</div>
            <p className="muted">Evidence of sustained practice.</p>
          </div>
          <div className="stat-card">
            <div className="kicker">Evidence confidence</div>
            <div className="stat">{averageReliability || 0}%</div>
            <p className="muted">How stable your current measured profile is.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="kicker">Highest-value focus</div>
          <h2 style={{ marginTop: 10 }}>{getSkillName(weakest?.skills) ?? "Complete diagnostic"}</h2>
          <p>
            {weakest
              ? `Current development score ${Math.round(weakest.score)}. This is your lowest measured capability so far, not a permanent label.`
              : "We need evidence before personalising your focus."}
          </p>
          <div className="inline-list" style={{ marginTop: 14 }}>
            <span className="pill">Adaptive session</span>
            <span className="pill">AI verification</span>
            <span className="pill">Spaced reinforcement</span>
          </div>
        </section>

        <section className="card">
          <div className="kicker">Emerging strength</div>
          <h2 style={{ marginTop: 10 }}>{getSkillName(strongest?.skills) ?? "No measured strength yet"}</h2>
          <p>
            {strongest
              ? `Current development score ${Math.round(strongest.score)}. Strengths still remain provisional while reliability is low.`
              : "Complete your first diagnostic to reveal your strongest measured capability."}
          </p>
          <div className="divider" />
          <p className="muted">Sessions completed so far: {responses ?? 0}</p>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="kicker">How today’s session is built</div>
        <h2 style={{ marginTop: 10 }}>Balanced, not repetitive.</h2>
        <div className="badge-grid" style={{ marginTop: 14 }}>
          <div className="stat-card"><strong>1.</strong><p>Weakest-skill reinforcement</p></div>
          <div className="stat-card"><strong>2.</strong><p>Second measured priority</p></div>
          <div className="stat-card"><strong>3.</strong><p>AI-output evaluation</p></div>
          <div className="stat-card"><strong>4.</strong><p>Decision or framing variety</p></div>
        </div>
      </section>

      <CoachCard />
    </>
  );
}
