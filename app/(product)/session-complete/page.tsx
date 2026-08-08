import Link from "next/link";
import { requireUser } from "@/lib/auth";

function skillName(value: any) { return Array.isArray(value) ? value[0]?.name : value?.name; }

export default async function SessionCompletePage() {
  const { user, supabase } = await requireUser();
  const [{ data: profile }, { data: session }, { data: scores }] = await Promise.all([
    supabase.from("profiles").select("xp,current_streak").eq("id", user.id).single(),
    supabase.from("training_sessions").select("id,completed_at").eq("user_id", user.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("user_skill_scores").select("score,attempts,skills(name)").eq("user_id", user.id).gt("attempts", 0).order("score"),
  ]);

  let correct = 0, total = 0, sessionXp = 0, patterns: string[] = [];
  if (session?.id) {
    const { data: responses } = await supabase.from("user_responses").select("is_correct,error_pattern").eq("user_id", user.id).eq("session_key", session.id);
    total = responses?.length ?? 0;
    correct = responses?.filter((r: { is_correct: boolean }) => r.is_correct).length ?? 0;
    sessionXp = (responses ?? []).reduce((sum: number, r: { is_correct: boolean }) => sum + (r.is_correct ? 12 : 7), 0);
    patterns = [...new Set((responses ?? []).map((r: { error_pattern: string | null }) => r.error_pattern).filter(Boolean) as string[])];
  }
  const score = total ? Math.round(correct / total * 100) : 0;
  const weakest = scores?.[0];

  return (
    <div className="cg-mobile-page cg-results-screen">
      <div className="cg-celebration">✦</div>
      <div className="cg-kicker">Results</div>
      <h1 className="cg-results-title">Excellent!</h1>
      <div className="cg-xp">+{sessionXp} XP</div>
      <p>You scored {correct} out of {total || 5}.</p>

      <div className="cg-result-stats">
        <div><small>Score</small><strong>{score}%</strong></div>
        <div><small>Streak</small><strong>{profile?.current_streak ?? 0}</strong></div>
        <div><small>Total XP</small><strong>{profile?.xp ?? 0}</strong></div>
      </div>

      <section className="cg-card">
        <div className="cg-kicker">Skill focus</div>
        <h2>{skillName(weakest?.skills) ?? "Keep building evidence"}</h2>
        <p>{weakest ? `This remains your highest-value measured development area at ${Math.round(weakest.score)}.` : "Your profile will become more useful as evidence accumulates."}</p>
      </section>

      {patterns.length > 0 && <section className="cg-card"><div className="cg-kicker">Patterns detected</div><div className="badge-row" style={{ marginTop: 12 }}>{patterns.map((p) => <span className="cg-pill" key={p}>{p.replaceAll("_", " ")}</span>)}</div></section>}

      <Link href="/dashboard" className="cg-button cg-full">Back to home</Link>
      <Link href="/skills" className="cg-button secondary cg-full">Review skills</Link>
    </div>
  );
}
