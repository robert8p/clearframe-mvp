import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import { ChallengeRunner } from "@/components/ChallengeRunner";
import { getOrCreatePracticeSession } from "@/lib/practice";

export const dynamic = "force-dynamic";

export default async function PracticePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user, supabase } = await requireUser();
  const diagnostic = await getDiagnosticProgress(supabase, user.id);
  if (!diagnostic.completedSessionKey) redirect("/onboarding");

  const { data: skill } = await supabase.from("skills").select("name,slug").eq("slug", slug).maybeSingle();
  if (!skill) notFound();
  const session = await getOrCreatePracticeSession(supabase, user.id, slug, 3);
  if (!session?.id || !session.challenges.length) redirect(`/skills/${slug}`);
  if (session.answeredChallengeIds.length >= session.challenges.length) redirect(`/skills/${slug}?practised=1`);

  return <ChallengeRunner challenges={session.challenges} mode="practice" sessionId={session.id} initialAnsweredChallengeIds={session.answeredChallengeIds} completionHref={`/skills/${slug}?practised=1`} modeLabel={`${skill.name} practice`} />;
}
