import { requireUser } from "@/lib/auth";

export default async function AchievementsPage() {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("xp,current_streak").eq("id", user.id).single();

  const items = [
    { name: "First Principles", emoji: "🏆", done: (profile?.xp ?? 0) >= 50, desc: "Earn 50 XP." },
    { name: "Seven-Day Signal", emoji: "🔥", done: (profile?.current_streak ?? 0) >= 7, desc: "Build a 7-day streak." },
    { name: "Evidence Habit", emoji: "💎", done: (profile?.xp ?? 0) >= 250, desc: "Earn 250 XP through practice." },
  ];

  return (
    <>
      <div className="cg-kicker">Achievements</div>
      <h1>Progress, without childishness.</h1>
      <div className="cg-grid three" style={{ marginTop: 18 }}>
        {items.map((item) => (
          <section key={item.name} className="achievement" style={{ opacity: item.done ? 1 : 0.58 }}>
            <div className="achievement-icon">{item.emoji}</div>
            <span className="cg-pill">{item.done ? "Unlocked" : "Locked"}</span>
            <h2 style={{ marginTop: 14 }}>{item.name}</h2>
            <p>{item.desc}</p>
          </section>
        ))}
      </div>
    </>
  );
}
