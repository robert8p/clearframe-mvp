import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { audienceMeta, isAudienceSegment } from "@/lib/audience";

export default async function Onboarding() {
  const { user, supabase } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("audience_segment").eq("id", user.id).single();
  if (!isAudienceSegment(profile?.audience_segment)) redirect("/onboarding/audience");
  const audience = audienceMeta(profile.audience_segment);

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Welcome to Cogni</div>
      <h1 className="cg-screen-title">Measure first. Train second.</h1>
      <section className="cg-card cg-context-callout">
        <span className="cg-audience-icon" aria-hidden="true">{audience?.icon}</span>
        <div><small>Your learning context</small><strong>{audience?.label}</strong><p>Your diagnostic measures judgement. Your daily lessons and examples will then use situations relevant to this context.</p></div>
        <Link href="/onboarding/audience">Change</Link>
      </section>
      <section className="cg-card">
        <div className="cg-brain-orb mini"><span>◌</span></div>
        <h2>Your diagnostic</h2>
        <p>12 challenges across evidence, reasoning, AI verification, bias recognition and confidence calibration. Expect 10–15 minutes.</p>
        <div className="callout"><strong>Important:</strong> these are development scores, not psychometric percentiles.</div>
        <Link className="cg-button cg-full" href="/diagnostic" style={{ marginTop: 16 }}>Begin diagnostic</Link>
      </section>
      <section className="cg-card">
        <div className="cg-kicker">How to answer</div>
        <p><strong>Choose the strongest answer.</strong> We care about reasoning quality, not speed theatre.</p>
        <p><strong>Rate confidence honestly.</strong> Calibration is part of the skill.</p>
        <p><strong>Use the explanation.</strong> The learning value sits in why an answer is stronger.</p>
      </section>
    </div>
  );
}
