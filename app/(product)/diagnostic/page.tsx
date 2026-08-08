import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ChallengeRunner } from "@/components/ChallengeRunner";
import { getDiagnosticProgress } from "@/lib/diagnostic";
import type { Challenge } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DiagnosticPage() {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase.from("challenges").select("id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,scenario_context").eq("is_published", true).eq("is_diagnostic", true).order("sort_order").limit(12);
  if (error) throw error;

  const challenges = (data ?? []) as Challenge[];
  if (!challenges.length) {
    return (
      <div className="cg-mobile-page cg-state-view">
        <div className="cg-state-icon">↻</div>
        <div className="cg-kicker">Starting check unavailable</div>
        <h1 className="cg-screen-title">We couldn’t load your starting questions.</h1>
        <p>Nothing has been lost. Go back to the setup screen and try again, or use Help if the issue continues.</p>
        <Link className="cg-button cg-full" href="/onboarding">Back to setup</Link>
        <Link className="cg-button secondary cg-full" href="/support">Get help</Link>
      </div>
    );
  }

  const progress = await getDiagnosticProgress(supabase, user.id, challenges.map((challenge) => challenge.id));
  if (progress.completedSessionKey) redirect("/diagnostic/results");
  const sessionId = progress.resumableSessionKey ?? randomUUID();
  return <ChallengeRunner challenges={challenges} mode="diagnostic" sessionId={sessionId} initialAnsweredChallengeIds={progress.answeredChallengeIds} modeLabel="Starting check" />;
}
