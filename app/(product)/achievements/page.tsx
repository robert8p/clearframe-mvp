import { requireUser } from "@/lib/auth";

export default async function AchievementsPage() {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("xp,current_streak").eq("id", user.id).single();
  const items = [
    { icon: "🏆", name: "First Principles", done: (profile?.xp ?? 0) >= 50, desc: "Earn 50 XP." },
    { icon: "🔥", name: "Seven-Day Signal", done: (profile?.current_streak ?? 0) >= 7, desc: "Build a 7-day streak." },
    { icon: "💎", name: "Evidence Habit", done: (profile?.xp ?? 0) >= 250, desc: "Earn 250 XP through practice." },
  ];
  return <div className="cg-mobile-page"><div className="cg-kicker">Achievements</div><h1 className="cg-screen-title">Your milestones</h1><div className="cg-achievement-list">{items.map((x) => <div className={`cg-achievement-card ${x.done ? "done" : ""}`} key={x.name}><div className="cg-achievement-big">{x.icon}</div><div><strong>{x.name}</strong><p>{x.desc}</p></div><span>{x.done ? "✓" : "○"}</span></div>)}</div></div>;
}
