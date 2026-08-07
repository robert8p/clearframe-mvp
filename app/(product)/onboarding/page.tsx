import Link from "next/link";

export default function Onboarding() {
  return (
    <>
      <div className="kicker">Before we personalise</div>
      <h1>Measure first. Train second.</h1>
      <div className="grid grid-2">
        <section className="card hero-card">
          <h2>Your diagnostic</h2>
          <p>
            12 challenges across evidence evaluation, reasoning, AI verification,
            bias recognition and confidence calibration. Expect roughly 10–15 minutes.
          </p>
          <div className="callout" style={{ margin: "18px 0" }}>
            <strong>Important:</strong> these are development scores, not psychometric percentiles.
          </div>
          <Link className="button" href="/diagnostic">
            Begin diagnostic
          </Link>
        </section>

        <section className="card">
          <h2>How to answer well</h2>
          <div className="section-stack">
            <p><strong>Choose the strongest answer.</strong> We want your reasoning, not speed.</p>
            <p><strong>Rate your confidence honestly.</strong> Calibration is part of the skill.</p>
            <p><strong>Expect useful feedback.</strong> Cogni tracks the pattern behind mistakes, not just correctness.</p>
          </div>
        </section>
      </div>
    </>
  );
}
