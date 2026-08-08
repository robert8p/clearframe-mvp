"use client";

import { useEffect, useState } from "react";

export function CoachCard() {
  const [insight, setInsight] = useState("Looking at your recent answers…");
  useEffect(() => {
    fetch("/api/coach").then((r) => r.json()).then((b) => setInsight(b.insight ?? "Complete a few more questions to unlock a useful coaching tip.")).catch(() => setInsight("Complete a few more questions to unlock a useful coaching tip."));
  }, []);

  return (
    <section className="cg-card cg-buddy-card">
      <div className="cg-buddy-robot" aria-hidden="true"><span>• •</span></div>
      <div>
        <div className="cg-kicker">AI coach</div>
        <h2>A tip from your recent answers</h2>
        <p>{insight}</p>
      </div>
    </section>
  );
}
