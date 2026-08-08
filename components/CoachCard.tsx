"use client";

import { useEffect, useState } from "react";

export function CoachCard() {
  const [insight, setInsight] = useState("Generating your insight…");

  useEffect(() => {
    fetch("/api/coach")
      .then((response) => response.json())
      .then((body) => setInsight(body.insight ?? "Complete more questions to unlock a grounded coaching insight."))
      .catch(() => setInsight("Complete more questions to unlock a grounded coaching insight."));
  }, []);

  return (
    <section className="cg-card">
      <div className="cg-kicker">AI study buddy</div>
      <h2 style={{ marginTop: 10 }}>This week’s coaching insight</h2>
      <p>{insight}</p>
    </section>
  );
}
