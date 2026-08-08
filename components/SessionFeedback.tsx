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
  const [savedReaction, setSavedReaction] = useState<Reaction | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [message, setMessage] = useState("");

  async function save(value: Reaction, note?: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/session-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reaction: value, comment: note?.trim() || undefined }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(typeof body.error === "string" ? body.error : "Could not save your feedback.");
        return false;
      }
      return true;
    } catch {
      setMessage("Connection interrupted. Try saving your feedback again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function choose(value: Reaction) {
    if (busy) return;
    setReaction(value);
    setNoteSaved(false);
    if (await save(value)) setSavedReaction(value);
  }

  async function saveNote() {
    if (!reaction || busy || !comment.trim()) return;
    if (await save(reaction, comment)) setNoteSaved(true);
  }

  return (
    <section className="cg-card cg-feedback-survey">
      <div className="cg-kicker">Help shape Cogni</div>
      <h2>How did today’s session feel?</h2>
      <p>One tap saves your reaction. Add a note only if there’s something useful to say.</p>
      <div className="cg-reaction-grid" role="radiogroup" aria-label="Session feedback">
        {choices.map((choice) => (
          <button key={choice.value} type="button" role="radio" aria-checked={reaction === choice.value} className={reaction === choice.value ? "selected" : ""} disabled={busy} onClick={() => void choose(choice.value)}>
            <span>{choice.emoji}</span><strong>{choice.label}</strong>
          </button>
        ))}
      </div>

      {savedReaction && (
        <div className="cg-feedback-comment">
          <span className="cg-feedback-saved">✓ Reaction saved</span>
          <label htmlFor="session-feedback-comment">Anything you’d change? <span>Optional</span></label>
          <textarea id="session-feedback-comment" className="input" rows={3} maxLength={1000} value={comment} onChange={(event) => { setComment(event.target.value); setNoteSaved(false); }} placeholder="Too easy, too wordy, loved the example, wanted a harder decision…" />
          {comment.trim() && <button type="button" className="cg-button secondary cg-full" disabled={busy || noteSaved} onClick={() => void saveNote()}>{busy ? "Saving…" : noteSaved ? "Note saved ✓" : "Save optional note"}</button>}
        </div>
      )}
      {message && <div className="cg-inline-error" role="alert">{message}</div>}
    </section>
  );
}
