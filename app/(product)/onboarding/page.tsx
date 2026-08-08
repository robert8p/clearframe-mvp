import Link from "next/link";

export default function OnboardingPage() {
  return (
    <>
      <div className="cg-kicker">Welcome to Cogni</div>
      <h1>Measure first. Personalise second.</h1>
      <div className="cg-grid two">
        <section className="cg-card">
          <h2>Your diagnostic</h2>
          <p>
            12 questions. About 10–15 minutes. Enough to establish your first measured judgement profile.
          </p>
          <div className="callout" style={{ margin: "18px 0" }}>
            <strong>Important:</strong> these are adaptive development scores, not psychometric percentile claims.
          </div>
          <Link href="/diagnostic" className="cg-button">Begin diagnostic</Link>
        </section>
        <section className="cg-card">
          <h2>How to approach it</h2>
          <p><strong>Choose the strongest answer.</strong> We care about quality of thought, not speed theatre.</p>
          <p><strong>Rate confidence honestly.</strong> Calibration is part of the skill.</p>
          <p><strong>Expect explanation.</strong> Cogni tracks patterns behind mistakes, not just right vs wrong.</p>
        </section>
      </div>
    </>
  );
}
