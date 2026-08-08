import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { audienceMeta, isAudienceSegment } from "@/lib/audience";
import { getDiagnosticProgress } from "@/lib/diagnostic";

export default async function Onboarding() {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("audience_segment").eq("id", user.id).single();
  if (!isAudienceSegment(profile?.audience_segment)) redirect("/onboarding/audience");
  const audience = audienceMeta(profile.audience_segment);
  const diagnostic = await getDiagnosticProgress(supabase, user.id);
  if (diagnostic.completedSessionKey) redirect("/dashboard");

  const answered = diagnostic.answeredChallengeIds.length;
  const total = diagnostic.challengeCount || 12;
  const continuing = answered > 0;

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Welcome to Cogni</div>
      <h1 className="cg-screen-title">Start with a quick check</h1>

      <section className="cg-card cg-context-callout">
        <span className="cg-audience-icon" aria-hidden="true">{audience?.icon}</span>
        <div>
          <small>Your learning context</small>
          <strong>{audience?.label}</strong>
          <p>Your starting check gives Cogni a first view of your skills. Daily lessons and questions then use situations that fit this context.</p>
        </div>
        <Link href="/onboarding/audience">Change context</Link>
      </section>

      <section className="cg-card cg-diagnostic-card">
        <div className="cg-diagnostic-card-head">
          <div className="cg-diagnostic-orb" aria-hidden="true"><span>◌</span></div>
          <div className="cg-diagnostic-copy">
            <div className="cg-kicker">10–15 minute starting check</div>
            <h2>{continuing ? "Continue your starting check" : "Your starting check"}</h2>
            <p>{continuing ? `${answered} of ${total} answers are already saved. Continue where you stopped.` : `${total} questions about evidence, reasoning, AI answers, thinking biases and how sure you are.`}</p>
          </div>
        </div>
        <div className="callout"><strong>What this is:</strong> a starting point that helps Cogni personalise your training. It is not an IQ test and does not rank you against other people.</div>
        <Link className="cg-button cg-full" href="/diagnostic">{continuing ? `Continue starting check · ${answered}/${total}` : "Begin starting check"}</Link>
      </section>

      <section className="cg-card">
        <div className="cg-kicker">How to answer</div>
        <p><strong>Choose the answer you think is strongest.</strong> Take your time.</p>
        <p><strong>Tell us how sure you are.</strong> Matching confidence to evidence is part of good judgement.</p>
        <p><strong>Read the explanation.</strong> It shows why one answer is stronger.</p>
      </section>

      <p className="cg-inline-note">Not ready to start yet? Use the navigation below to explore skills, view progress or update your profile. Your starting check will be here when you return.</p>
    </div>
  );
}
