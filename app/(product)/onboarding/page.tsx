import Link from "next/link";

export default function Onboarding() {
  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Welcome to Cogni</div>
      <h1 className="cg-screen-title">Measure first. Train second.</h1>
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
