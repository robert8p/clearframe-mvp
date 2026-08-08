"use client";

import { useState } from "react";

type Reaction = "not_for_me" | "good" | "great";

const choices: Array<{ value: Reaction; emoji: string; label: string }> = [
  { value: "not_for_me", emoji: "😕", label: "Not for me" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "great", emoji: "🤩", label: "Great" },
];

export function SessionFeedback() {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!reaction || busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/session-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reaction, comment: comment.trim() || undefined }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error || "Could not save your feedback.");
      return;
    }
    setSaved(true);
  }

  if (saved) {
    return (
      <section className="cg-card cg-feedback-survey cg-feedback-thanks" aria-live="polite">
        <span className="cg-feedback-thanks-icon">✓</span>
        <div><strong>Thanks — that helps Cogni get better.</strong><p>Tomorrow’s session will keep adapting to your learning context and the judgement skills that need the most useful practice.</p></div>
      </section>
    );
  }

  return (
    <section className="cg-card cg-feedback-survey">
      <div className="cg-kicker">Help shape Cogni</div>
      <h2>How did today’s session feel?</h2>
      <p>One tap is enough. This helps us distinguish learning value from content people simply tolerate.</p>
      <div className="cg-reaction-grid" role="radiogroup" aria-label="Session feedback">
        {choices.map((choice) => (
          <button key={choice.value} type="button" role="radio" aria-checked={reaction === choice.value} className={reaction === choice.value ? "selected" : ""} onClick={() => setReaction(choice.value)}>
            <span>{choice.emoji}</span><strong>{choice.label}</strong>
          </button>
        ))}
      </div>
      {reaction && (
        <div className="cg-feedback-comment">
          <label htmlFor="session-feedback-comment">Anything you’d change? <span>Optional</span></label>
          <textarea id="session-feedback-comment" className="input" rows={3} maxLength={1000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Too easy, too wordy, loved the example, wanted a harder decision…" />
          <button type="button" className="cg-button cg-full" disabled={busy} onClick={submit}>{busy ? "Saving…" : "Send feedback"}</button>
        </div>
      )}
      {message && <p className="cg-form-message" aria-live="polite">{message}</p>}
    </section>
  );
}
