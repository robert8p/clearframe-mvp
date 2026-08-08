"use client";

import { FormEvent, useState } from "react";
import { AUDIENCE_SEGMENTS } from "@/lib/audience";

const skills = [
  ["critical-thinking", "Critical thinking"], ["ai-output-verification", "AI-output verification"], ["evidence-evaluation", "Evidence evaluation"],
  ["logical-reasoning", "Logical reasoning"], ["bias-recognition", "Cognitive-bias recognition"], ["decision-uncertainty", "Decision-making under uncertainty"],
  ["problem-framing", "Problem framing"], ["assumption-identification", "Assumption identification"], ["correlation-causation", "Correlation vs causation"],
  ["source-quality", "Source-quality evaluation"], ["hallucination-detection", "Hallucination detection"], ["missing-information", "Identifying missing information"],
  ["argument-comparison", "Comparing competing arguments"], ["better-questions", "Asking better questions"], ["ai-trust-boundaries", "Knowing when not to trust AI"],
] as const;

export function AdminLessonForm() {
  const [audiences, setAudiences] = useState<string[]>(["all"]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggleAudience(value: string) {
    setMessage("");
    setError("");
    if (value === "all") return setAudiences(["all"]);
    setAudiences((current) => {
      const next = current.filter((item) => item !== "all");
      const updated = next.includes(value) ? next.filter((item) => item !== value) : [...next, value];
      return updated.length ? updated : ["all"];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const fd = new FormData(event.currentTarget);
      const payload = {
        title: String(fd.get("title") ?? "").trim(),
        subtitle: String(fd.get("subtitle") ?? "").trim(),
        emoji: String(fd.get("emoji") ?? "🧠").trim(),
        skillSlug: String(fd.get("skill") ?? ""),
        difficulty: Number(fd.get("difficulty")),
        estimatedMinutes: Number(fd.get("minutes")),
        scenarioContext: String(fd.get("scenario") ?? "").trim(),
        audienceSegments: audiences.length ? audiences : ["all"],
        content: {
          story: String(fd.get("story") ?? "").trim(),
          twist: String(fd.get("twist") ?? "").trim(),
          principle: String(fd.get("principle") ?? "").trim(),
          try_it: String(fd.get("try") ?? "").trim(),
          reveal: String(fd.get("reveal") ?? "").trim(),
          ai_age: String(fd.get("ai") ?? "").trim(),
        },
      };
      const response = await fetch("/api/admin/lessons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Could not create this lesson.");
      setMessage("Lesson created and published.");
      event.currentTarget.reset();
      setAudiences(["all"]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create this lesson.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="cg-card cg-admin-author" onSubmit={submit}>
      <div className="cg-kicker">Lesson authoring</div>
      <h2>Create daily lesson</h2>
      <label htmlFor="lesson-title">Title</label><input id="lesson-title" className="input" name="title" required />
      <label htmlFor="lesson-subtitle">Subtitle</label><input id="lesson-subtitle" className="input" name="subtitle" required />
      <div className="cg-grid two">
        <div><label htmlFor="lesson-emoji">Emoji</label><input id="lesson-emoji" className="input" name="emoji" defaultValue="🧠" required /></div>
        <div><label htmlFor="lesson-difficulty">Difficulty</label><input id="lesson-difficulty" className="input" name="difficulty" type="number" min="20" max="90" defaultValue="50" required /></div>
        <div><label htmlFor="lesson-minutes">Minutes</label><input id="lesson-minutes" className="input" name="minutes" type="number" min="1" max="10" defaultValue="3" required /></div>
        <div><label htmlFor="lesson-skill">Skill</label><select id="lesson-skill" className="input" name="skill">{skills.map(([slug, name]) => <option value={slug} key={slug}>{name}</option>)}</select></div>
      </div>
      <label htmlFor="lesson-scenario">Scenario context</label><input id="lesson-scenario" className="input" name="scenario" placeholder="e.g. Executive • capital-allocation decision" />
      <label>Applicable audiences</label>
      <div className="cg-admin-audience-picks"><button type="button" className={`cg-pill ${audiences.includes("all") ? "active" : ""}`} onClick={() => toggleAudience("all")}>All audiences</button>{AUDIENCE_SEGMENTS.map((item) => <button type="button" key={item.slug} className={`cg-pill ${audiences.includes(item.slug) ? "active" : ""}`} onClick={() => toggleAudience(item.slug)}>{item.icon} {item.shortLabel}</button>)}</div>
      <label htmlFor="lesson-story">Story / hook</label><textarea id="lesson-story" className="input" name="story" rows={3} required />
      <label htmlFor="lesson-twist">The twist</label><textarea id="lesson-twist" className="input" name="twist" rows={2} required />
      <label htmlFor="lesson-principle">Thinking principle</label><textarea id="lesson-principle" className="input" name="principle" rows={2} required />
      <label htmlFor="lesson-try">Your-turn question</label><textarea id="lesson-try" className="input" name="try" rows={2} required />
      <label htmlFor="lesson-reveal">Reveal</label><textarea id="lesson-reveal" className="input" name="reveal" rows={2} required />
      <label htmlFor="lesson-ai">Audience-specific AI-age application</label><textarea id="lesson-ai" className="input" name="ai" rows={3} required />
      <button className="cg-button cg-full" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Publishing…" : "Create and publish lesson"}</button>
      {message && <p className="cg-form-message" aria-live="polite">{message}</p>}
      {error && <div className="cg-inline-error" role="alert">{error}</div>}
    </form>
  );
}
