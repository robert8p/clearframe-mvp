import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { CoachCard } from "@/components/CoachCard";

function getSkillName(value: any) {
  return Array.isArray(value) ? value[0]?.name : value?.name;
}

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  const [{ data: profile }, { data: scores }, { count: responseCount }] = await Promise.all([
    supabase.from("profiles").select("full_name,xp,current_streak").eq("id", user.id).single(),
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name)").eq("user_id", user.id).gt("attempts", 0).order("score"),
    supabase.from("user_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const weakest = scores?.[0];
  const strongest = scores?.[(scores?.length ?? 1) - 1];
  const displayName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <div className="cg-topbar">
        <div>
          <div className="cg-kicker">Home</div>
          <h1>Hello, {displayName} 👋</h1>
          <p>Ready to learn something valuable today?</p>
        </div>
        <span className="cg-pill">🔥 {profile?.current_streak ?? 0} day streak</span>
      </div>

      <div className="cg-grid two">
        <section className="cg-card">
          <div className="cg-kicker">Daily challenge</div>
          <h2>Judgement training</h2>
          <p>Continue with today’s personalised session built around your measured profile.</p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", margin: "18px 0" }}>
            <div className="progress-ring">75%</div>
            <div>
              <strong style={{ fontSize: 20 }}>Great progress!</strong>
              <p style={{ margin: "6px 0 0" }}>Keep building the habit. Every session compounds.</p>
            </div>
          </div>
          <div className="progress"><span style={{ width: "72%" }} /></div>
          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={responseCount ? "/training" : "/onboarding"} className="cg-button">Start session</Link>
            <span className="cg-pill">+150 XP</span>
            <span className="cg-pill">5 questions</span>
          </div>
        </section>

        <section className="cg-card">
          <div className="cg-kicker">Your progress</div>
          <div className="cg-grid two" style={{ alignItems: "center" }}>
            <div>
              <div className="cg-stat">{profile?.xp ?? 0}</div>
              <p>Total XP earned</p>
              <div className="cg-stat" style={{ fontSize: 28, marginTop: 12 }}>{responseCount ?? 0}</div>
              <p>Recorded responses</p>
            </div>
            <div className="metric-list">
              <div className="cg-panel">
                <div className="cg-kicker">Highest-value focus</div>
                <strong>{getSkillName(weakest?.skills) ?? "Take diagnostic"}</strong>
                <p style={{ margin: "6px 0 0" }}>{weakest ? `Current measured score ${Math.round(weakest.score)}.` : "We need evidence before personalising your focus."}</p>
              </div>
              <div className="cg-panel">
                <div className="cg-kicker">Emerging strength</div>
                <strong>{getSkillName(strongest?.skills) ?? "Not yet measured"}</strong>
                <p style={{ margin: "6px 0 0" }}>{strongest ? `Current measured score ${Math.round(strongest.score)}.` : "Complete more items to reveal strengths."}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="cg-grid three" style={{ marginTop: 18 }}>
        <section className="cg-card"><div className="cg-kicker">Session structure</div><h2>Balanced by design</h2><p>Weak-skill reinforcement, AI verification and diverse challenge types.</p></section>
        <section className="cg-card"><div className="cg-kicker">AI-era skill</div><h2>Challenge outputs</h2><p>Cogni trains you to question polished answers before they become bad decisions.</p></section>
        <section className="cg-card"><div className="cg-kicker">Professional edge</div><h2>Think deeper</h2><p>Better questions, better framing and better decisions under uncertainty.</p></section>
      </div>

      <div style={{ marginTop: 18 }}><CoachCard /></div>
    </>
  );
}
