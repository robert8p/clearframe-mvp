"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyLesson as DailyLessonType } from "@/lib/types";

function track(eventName: string, properties: Record<string, unknown> = {}) {
  return fetch("/api/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ eventName, properties }),
    keepalive: true,
  }).catch(() => undefined);
}

export function DailyLesson({ lesson }: { lesson: DailyLessonType }) {
  const [step, setStep] = useState(0);
  const [reflection, setReflection] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState<number | null>(null);
  const router = useRouter();
  const slides = useMemo(() => [
    { kicker: "Today’s story", title: lesson.title, body: lesson.content.story, icon: lesson.emoji },
    { kicker: "The twist", title: "Here’s what makes it interesting", body: lesson.content.twist, icon: "⚡" },
    { kicker: "The thinking move", title: lesson.subtitle, body: lesson.content.principle, icon: "🧠" },
    { kicker: "Your turn", title: "Think before you reveal", body: lesson.content.try_it, icon: "✍️", reflection: true },
    { kicker: "AI-age application", title: "Use it today", body: lesson.content.ai_age, icon: "✦" },
  ], [lesson]);
  const slide = slides[step];
  const progress = Math.round(((step + 1) / slides.length) * 100);

  useEffect(() => {
    void track("daily_lesson_started", { lesson_id: lesson.id, lesson_slug: lesson.slug, estimated_minutes: lesson.estimated_minutes });
  }, [lesson.id, lesson.slug, lesson.estimated_minutes]);

  useEffect(() => {
    void track("daily_lesson_step", { lesson_id: lesson.id, step: step + 1, total_steps: slides.length, progress });
  }, [lesson.id, progress, slides.length, step]);

  async function complete() {
    if (busy) return;
    setBusy(true);
    const response = await fetch("/api/lesson/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return alert(body.error || "Could not complete today’s lesson");
    const earned = Number(body.xpEarned ?? 0);
    if (earned > 0) {
      setReward(earned);
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate([18, 35, 22]);
      await new Promise((resolve) => setTimeout(resolve, 650));
    }
    router.push("/training");
    router.refresh();
  }

  function next() {
    if (step < slides.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    void complete();
  }

  function reveal() {
    setRevealed(true);
    void track("daily_lesson_reveal", { lesson_id: lesson.id, reflection_length: reflection.trim().length });
  }

  return (
    <div className="cg-lesson-screen">
      <div className="cg-lesson-topline">
        <div><span className="cg-kicker">Daily lesson</span><strong>{lesson.estimated_minutes} min</strong></div>
        <span>{step + 1}/{slides.length}</span>
      </div>
      <div className="progress cg-animated-progress"><span style={{ width: `${progress}%` }} /></div>
      {lesson.scenario_context && <div className="cg-context-strip"><span>Context</span><strong>{lesson.scenario_context}</strong></div>}

      <section key={step} className="cg-lesson-story-card cg-question-stage">
        <div className="cg-lesson-emoji" aria-hidden="true">{slide.icon}</div>
        <span className="cg-kicker">{slide.kicker}</span>
        <h1>{slide.title}</h1>
        <p>{slide.body}</p>

        {slide.reflection && (
          <div className="cg-reflection-box">
            <label htmlFor="lesson-reflection">Your first instinct</label>
            <textarea
              id="lesson-reflection"
              className="input"
              rows={4}
              value={reflection}
              onChange={(event: { target: { value: string } }) => setReflection(event.target.value)}
              placeholder="Write one sentence. This stays on your device and is not graded."
            />
            {!revealed ? (
              <button className="cg-button secondary cg-full" disabled={reflection.trim().length < 3} onClick={reveal}>
                Reveal the thinking move
              </button>
            ) : (
              <div className="cg-lesson-reveal">
                <span>Compare your instinct</span>
                <strong>{lesson.content.reveal}</strong>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="cg-lesson-dots" aria-hidden="true">
        {slides.map((_, index) => <i key={index} className={index <= step ? "active" : ""} />)}
      </div>

      <button
        className="cg-button cg-full cg-lesson-next"
        onClick={next}
        disabled={busy || (slide.reflection && !revealed)}
      >
        {busy ? "Banking the lesson…" : reward ? `+${reward} XP earned ✦` : step === slides.length - 1 ? "Complete lesson +5 XP →" : "Continue →"}
      </button>
      <p className="cg-lesson-footnote">One idea. One memorable example. Then five judgement reps.</p>
    </div>
  );
}
