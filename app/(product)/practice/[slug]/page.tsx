import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { isAudienceSegment } from "@/lib/audience";
import { getOrCreatePracticeSession } from "@/lib/practice";
import { ChallengeRunner } from "@/components/ChallengeRunner";

export const dynamic = "force-dynamic";

export default async function PracticeSkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, supabase } = await requireUser();
  const [{ data: profile }, { data: skill }] = await Promise.all([
    supabase.from("profiles").select("audience_segment").eq("id", user.id).single(),
    supabase.from("skills").select("name,slug").eq("slug", slug).maybeSingle(),
  ]);
  if (!isAudienceSegment(profile?.audience_segment)) redirect("/onboarding/audience");
  if (!skill) redirect("/skills");
  const session = await getOrCreatePracticeSession(supabase, user.id, slug, 3);
  if (!session?.challenges.length) {
    return <div className="cg-mobile-page"><section className="cg-card"><h2>No practice set available yet</h2><p>Cogni does not yet have enough suitable content for this skill and learning context.</p><Link className="cg-button cg-full" href={`/skills/${slug}`}>Back to skill</Link></section></div>;
  }
  return <ChallengeRunner challenges={session.challenges} mode="practice" sessionId={session.id} initialAnsweredChallengeIds={session.answeredChallengeIds} completionHref={`/skills/${slug}?practised=1`} modeLabel={`${skill.name} practice`} />;
}
