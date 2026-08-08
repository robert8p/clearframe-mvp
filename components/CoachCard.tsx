"use client";

import { useEffect, useState } from "react";

export function CoachCard() {
  const [insight, setInsight] = useState("Analysing your recent evidence…");
  useEffect(() => {
    fetch("/api/coach").then((r) => r.json()).then((b) => setInsight(b.insight ?? "Complete more challenges to unlock a grounded insight.")).catch(() => setInsight("Complete more challenges to unlock a grounded insight."));
  }, []);

  return (
    <section className="cg-card cg-buddy-card">
      <div className="cg-buddy-robot" aria-hidden="true"><span>• •</span></div>
      <div>
        <div className="cg-kicker">AI study buddy</div>
        <h2>Your coaching insight</h2>
        <p>{insight}</p>
      </div>
    </section>
  );
}
