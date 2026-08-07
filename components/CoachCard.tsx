"use client";

import { useEffect, useState } from "react";

export function CoachCard() {
  const [insight, setInsight] = useState("Analysing your current evidence…");

  useEffect(() => {
    fetch("/api/coach")
      .then((response) => response.json())
      .then((body) =>
        setInsight(
          body.insight ??
            "Complete more challenges to unlock a grounded coaching insight.",
        ),
      )
      .catch(() =>
        setInsight("Complete more challenges to build your coaching insight."),
      );
  }, []);

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div className="kicker">Cogni coach</div>
      <h2 style={{ marginTop: 10 }}>What to notice this week</h2>
      <p>{insight}</p>
    </section>
  );
}
