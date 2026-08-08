import { requireUser } from "@/lib/auth";

export default async function AchievementsPage() {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("xp,current_streak").eq("id", user.id).single();
  const xp = Number(profile?.xp ?? 0);
  const streak = Number(profile?.current_streak ?? 0);
  const items = [
    { icon: "🏆", name: "First 50 XP", value: xp, target: 50, desc: "Earn 50 XP." },
    { icon: "🔥", name: "7-day streak", value: streak, target: 7, desc: "Learn on 7 days in a row." },
    { icon: "💎", name: "250 XP", value: xp, target: 250, desc: "Earn 250 XP through lessons and practice." },
  ];

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Achievements</div>
      <h1 className="cg-screen-title">Your milestones</h1>
      <p className="cg-page-intro">Milestones reward consistent learning. They do not change your skill scores. XP are points you earn by completing lessons and practice.</p>
      <div className="cg-achievement-list">
        {items.map((item) => {
          const done = item.value >= item.target;
          const progress = Math.min(100, Math.round(item.value / item.target * 100));
          return (
            <div className={`cg-achievement-card ${done ? "done" : ""}`} key={item.name}>
              <div className="cg-achievement-big">{item.icon}</div>
              <div>
                <strong>{item.name}</strong>
                <p>{item.desc}</p>
                <div className="progress cg-achievement-progress"><span style={{ width: `${progress}%` }} /></div>
                <div className="cg-achievement-progress-label"><span>{Math.min(item.value, item.target)} / {item.target}</span><span>{done ? "Complete" : `${progress}%`}</span></div>
              </div>
              <span>{done ? "✓" : "○"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
