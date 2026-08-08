import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { SignOutButton } from "@/components/SignOutButton";
import { audienceMeta, isAudienceSegment } from "@/lib/audience";

export default async function SettingsPage() {
  const { user, supabase } = await requireUser();
  const [{ data: profile }, { count: responses }] = await Promise.all([
    supabase.from("profiles").select("full_name,industry,job_role,xp,current_streak,is_admin,audience_segment").eq("id", user.id).single(),
    supabase.from("user_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const initials = (profile?.full_name || user.email || "C").split(/\s|@/).filter(Boolean).slice(0,2).map((x: string) => x[0]?.toUpperCase()).join("");
  const audience = isAudienceSegment(profile?.audience_segment) ? audienceMeta(profile.audience_segment) : null;

  return (
    <div className="cg-mobile-page">
      <div className="cg-profile-head">
        <div className="cg-avatar">{initials}</div>
        <div><h1 className="cg-profile-name">{profile?.full_name || "Cogni learner"}</h1><p>{user.email}</p>{audience && <a href="#learning-context" className="cg-context-pill">{audience.icon} {audience.label}</a>}</div>
      </div>
      <div className="cg-profile-stats"><div><strong>{responses ?? 0}</strong><small>Answers</small></div><div><strong>{profile?.xp ?? 0}</strong><small>XP</small></div><div><strong>{profile?.current_streak ?? 0}</strong><small>Streak</small></div></div>

      <section className="cg-section-head"><h2>Achievements</h2><Link href="/achievements">See all</Link></section>
      <Link href="/achievements" className="cg-achievement-row" aria-label="Open achievements"><div>🏆</div><div>💎</div><div>🔥</div><div>✦</div></Link>

      <ProfileForm
        initialName={profile?.full_name ?? ""}
        initialIndustry={profile?.industry ?? ""}
        initialRole={profile?.job_role ?? ""}
        initialAudience={isAudienceSegment(profile?.audience_segment) ? profile.audience_segment : null}
      />

      {profile?.is_admin && <div className="cg-profile-links"><Link href="/admin">Content management <span>›</span></Link><Link href="/analytics">Product analytics <span>›</span></Link></div>}
      <div className="cg-profile-links"><Link href="/achievements">Achievements <span>›</span></Link><Link href="/support">Help & support <span>›</span></Link></div>
      <div style={{ marginTop: 18 }}><SignOutButton /></div>
    </div>
  );
}
