import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";

export default async function SettingsPage() {
  const { user, supabase } = await requireUser();
  const [{ data: profile }, { count: responses }] = await Promise.all([
    supabase.from("profiles").select("full_name,industry,job_role,xp,current_streak,is_admin").eq("id", user.id).single(),
    supabase.from("user_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const initials = (profile?.full_name || user.email || "C").split(/\s|@/).filter(Boolean).slice(0,2).map((x: string) => x[0]?.toUpperCase()).join("");

  return (
    <div className="cg-mobile-page">
      <div className="cg-profile-head">
        <div className="cg-avatar">{initials}</div>
        <div><h1 className="cg-profile-name">{profile?.full_name || "Cogni learner"}</h1><p>{user.email}</p></div>
      </div>
      <div className="cg-profile-stats"><div><strong>{responses ?? 0}</strong><small>Answers</small></div><div><strong>{profile?.xp ?? 0}</strong><small>XP</small></div><div><strong>{profile?.current_streak ?? 0}</strong><small>Streak</small></div></div>

      <section className="cg-section-head"><h2>Achievements</h2><Link href="/achievements">See all</Link></section>
      <div className="cg-achievement-row"><div>🏆</div><div>💎</div><div>🔥</div><div>✦</div></div>

      <ProfileForm initialName={profile?.full_name ?? ""} initialIndustry={profile?.industry ?? ""} initialRole={profile?.job_role ?? ""} />

      {profile?.is_admin && <div className="cg-profile-links"><Link href="/admin">Content management <span>›</span></Link><Link href="/analytics">Product analytics <span>›</span></Link></div>}
      <div className="cg-profile-links"><Link href="/achievements">Achievements <span>›</span></Link><Link href="/">Help & support <span>›</span></Link></div>
      <div style={{ marginTop: 18 }}><SignOutButton /></div>
    </div>
  );
}

