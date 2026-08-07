import Link from "next/link";
export default function Onboarding(){
  return <>
    <div className="kicker">Before we personalise</div><h1>Measure first. Train second.</h1>
    <div className="grid grid-2">
      <section className="card"><h2>Your diagnostic</h2><p className="muted">12 challenges across evidence, reasoning, AI verification, bias recognition and confidence calibration. Expect 10–15 minutes.</p><p className="callout"><strong>Important:</strong> these are development scores, not psychometric percentiles.</p><Link className="button" href="/diagnostic">Begin diagnostic</Link></section>
      <section className="card"><h2>How to answer</h2><p className="muted">Choose the strongest answer, then tell us how confident you are. We care about the pattern behind mistakes, not just the score.</p></section>
    </div>
  </>;
}
