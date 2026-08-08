"use client";

import { useEffect, useState } from "react";

const confetti = Array.from({ length: 18 }, (_, index) => ({
  left: 6 + ((index * 17) % 88),
  delay: (index % 6) * 70,
  duration: 900 + (index % 5) * 110,
  rotation: (index * 47) % 180,
}));

export function SessionCelebration({ xp, streak, title }: { xp: number; streak: number; title: string }) {
  const [shownXp, setShownXp] = useState(0);

  useEffect(() => {
    if (xp <= 0) return;
    const duration = 650;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShownXp(Math.round(xp * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [xp]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([20, 45, 25, 60, 30]);
    void fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "reward_viewed", properties: { xp, streak, title } }),
      keepalive: true,
    }).catch(() => undefined);
  }, [streak, title, xp]);

  return (
    <div className="cg-session-celebration" aria-live="polite">
      <div className="cg-confetti-field" aria-hidden="true">
        {confetti.map((piece, index) => (
          <i
            key={index}
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}ms`,
              animationDuration: `${piece.duration}ms`,
              ["--rotation" as string]: `${piece.rotation}deg`,
            }}
          />
        ))}
      </div>
      <div className="cg-celebration"><span>✦</span></div>
      <div className="cg-kicker">Session complete</div>
      <h1 className="cg-results-title">{title}</h1>
      <div className="cg-xp">+{shownXp} XP</div>
      {streak > 0 && <div className="cg-streak-pop">🔥 {streak} day streak</div>}
    </div>
  );
}
