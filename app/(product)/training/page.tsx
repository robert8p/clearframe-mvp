import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ChallengeRunner } from "@/components/ChallengeRunner";
import { getOrCreateDailyTrainingSession } from "@/lib/recommendation";
import type { Challenge } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const { user, supabase } = await requireUser();

  const session = await getOrCreateDailyTrainingSession(
    supabase,
    user.id,
    5,
  );

  if (!session.id || session.challenges.length === 0) {
    return (
      <section className="card">
        <h2>No challenges available</h2>
        <p className="muted">
          Cogni could not build today&apos;s training session. Confirm
          that the seed migration has been loaded, then refresh this page.
        </p>
      </section>
    );
  }

  if (
    session.status === "completed" ||
    session.answeredChallengeIds.length >= session.challenges.length
  ) {
    redirect("/session-complete");
  }

  return (
    <ChallengeRunner
      challenges={session.challenges as Challenge[]}
      mode="training"
      sessionId={session.id}
      initialAnsweredChallengeIds={session.answeredChallengeIds}
    />
  );
}
