"use client";

import { FormEvent, useState } from "react";
import { AUDIENCE_SEGMENTS } from "@/lib/audience";

type Format = "single_choice" | "multi_select" | "ranking" | "classification" | "triage";

const skills = [
  ["critical-thinking", "Critical thinking"], ["ai-output-verification", "AI-output verification"], ["evidence-evaluation", "Evidence evaluation"],
  ["logical-reasoning", "Logical reasoning"], ["bias-recognition", "Cognitive-bias recognition"], ["decision-uncertainty", "Decision-making under uncertainty"],
  ["problem-framing", "Problem framing"], ["assumption-identification", "Assumption identification"], ["correlation-causation", "Correlation vs causation"],
  ["source-quality", "Source-quality evaluation"], ["hallucination-detection", "Hallucination detection"], ["missing-information", "Identifying missing information"],
  ["argument-comparison", "Comparing competing arguments"], ["better-questions", "Asking better questions"], ["ai-trust-boundaries", "Knowing when not to trust AI"],
] as const;

const formats: Array<[Format, string]> = [
  ["single_choice", "Single-choice scenario"],
  ["multi_select", "Multi-select audit"],
  ["ranking", "Ranking"],
  ["classification", "Classification / sorting"],
  ["triage", "Scenario triage"],
];

export function AdminChallengeForm() {
  const [format, setFormat] = useState<Format>("single_choice");
  const [audiences, setAudiences] = useState<string[]>(["all"]);
  const [multiCorrect, setMultiCorrect] = useState<number[]>([]);
  const [ranking, setRanking] = useState<number[]>([0, 1, 2, 3]);
  const [classification, setClassification] = useState<string[]>(["cat1", "cat1", "cat2", "cat2"]);
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

  function toggleMulti(index: number) {
    setMultiCorrect((current) => current.includes(index) ? current.filter((value) => value !== index) : [...current, index]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const fd = new FormData(event.currentTarget);
      const options = ["a", "b", "c", "d"].map((name) => String(fd.get(name) ?? "").trim());
      let correctIndex: number | null = null;
      let correctAnswer: unknown = null;
      let interactionConfig: Record<string, unknown> = {};

      if (format === "single_choice" || format === "triage") correctIndex = Number(fd.get("correct"));
      if (format === "multi_select") {
        if (!multiCorrect.length) throw new Error("Select at least one correct answer.");
        correctAnswer = multiCorrect;
      }
      if (format === "ranking") {
        if (ranking.length !== options.length || new Set(ranking).size !== options.length) throw new Error("Each ranking position must use a different option.");
        correctAnswer = ranking;
        interactionConfig = { instructions: "Tap the cards in strongest-to-weakest order." };
      }
      if (format === "classification") {
        const category1 = String(fd.get("category1") ?? "").trim();
        const category2 = String(fd.get("category2") ?? "").trim();
        if (!category1 || !category2 || category1.toLowerCase() === category2.toLowerCase()) throw new Error("Give the two classification categories different names.");
        interactionConfig = { categories: [{ id: "cat1", label: category1 }, { id: "cat2", label: category2 }], instructions: "Classify every statement." };
        correctAnswer = Object.fromEntries(classification.map((value, index) => [String(index), value]));
      }

      const payload = {
        title: String(fd.get("title") ?? "").trim(),
        prompt: String(fd.get("prompt") ?? "").trim(),
        options,
        interactionType: format,
        interactionConfig,
        correctIndex,
        correctAnswer,
        difficulty: Number(fd.get("difficulty")),
        skillSlug: String(fd.get("skill") ?? ""),
        audienceSegments: audiences,
        scenarioContext: String(fd.get("scenario") ?? "").trim(),
        explanation: String(fd.get("explanation") ?? "").trim(),
        thinkingPrinciple: String(fd.get("principle") ?? "").trim(),
        application: String(fd.get("application") ?? "").trim(),
      };

      const response = await fetch("/api/admin/challenges", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Could not create this challenge.");
      setMessage(body.correctPosition ? `Challenge published. Correct MCQ position balanced to ${body.correctPosition}.` : "Challenge created and published.");
      event.currentTarget.reset();
      setFormat("single_choice");
      setAudiences(["all"]);
      setMultiCorrect([]);
      setRanking([0, 1, 2, 3]);
      setClassification(["cat1", "cat1", "cat2", "cat2"]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create this challenge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="cg-card cg-admin-author" onSubmit={submit}>
      <div className="cg-kicker">Challenge authoring</div>
      <h2>Create scored challenge</h2>
      <p>Author the learner interaction here; Cogni stores audience, format and answer logic with the challenge.</p>

      <div className="cg-grid two">
        <div><label htmlFor="challenge-format">Question format</label><select id="challenge-format" className="input" value={format} onChange={(event) => { setFormat(event.target.value as Format); setMessage(""); setError(""); }}>{formats.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
        <div><label htmlFor="challenge-difficulty">Difficulty</label><input id="challenge-difficulty" className="input" name="difficulty" type="number" min="20" max="90" defaultValue="50" required /></div>
        <div><label htmlFor="challenge-skill">Primary skill</label><select id="challenge-skill" className="input" name="skill">{skills.map(([slug, name]) => <option value={slug} key={slug}>{name}</option>)}</select></div>
        <div><label htmlFor="challenge-scenario">Scenario context</label><input id="challenge-scenario" className="input" name="scenario" placeholder="e.g. Management • supplier decision" /></div>
      </div>

      <label>Applicable audiences</label>
      <div className="cg-admin-audience-picks">
        <button type="button" className={`cg-pill ${audiences.includes("all") ? "active" : ""}`} onClick={() => toggleAudience("all")}>All audiences</button>
        {AUDIENCE_SEGMENTS.map((item) => <button type="button" key={item.slug} className={`cg-pill ${audiences.includes(item.slug) ? "active" : ""}`} onClick={() => toggleAudience(item.slug)}>{item.icon} {item.shortLabel}</button>)}
      </div>

      <label htmlFor="challenge-title">Title</label><input id="challenge-title" className="input" name="title" required />
      <label htmlFor="challenge-prompt">Prompt / scenario</label><textarea id="challenge-prompt" className="input" name="prompt" rows={4} required />

      <div className="cg-grid two">
        {["A", "B", "C", "D"].map((letter, index) => <div key={letter}><label htmlFor={`challenge-option-${letter}`}>Option {letter}</label><input id={`challenge-option-${letter}`} className="input" name={letter.toLowerCase()} required />{format === "multi_select" && <label className="cg-admin-check"><input type="checkbox" checked={multiCorrect.includes(index)} onChange={() => toggleMulti(index)} /> Correct</label>}</div>)}
      </div>

      {(format === "single_choice" || format === "triage") && <div><label htmlFor="challenge-correct">Correct / strongest option</label><select id="challenge-correct" className="input" name="correct" defaultValue="0">{["A", "B", "C", "D"].map((letter, index) => <option value={index} key={letter}>{letter}</option>)}</select><small>{format === "single_choice" ? "Cogni will automatically rebalance the final A–D answer position across the question bank." : "Choose the action that represents the strongest judgement."}</small></div>}

      {format === "ranking" && <section className="cg-admin-answer-builder"><strong>Best order</strong><p>Choose which option belongs in each position.</p><div className="cg-grid two">{ranking.map((value, position) => <div key={position}><label htmlFor={`rank-${position}`}>Position {position + 1}</label><select id={`rank-${position}`} className="input" value={value} onChange={(event) => setRanking((current) => current.map((item, index) => index === position ? Number(event.target.value) : item))}>{["A", "B", "C", "D"].map((letter, optionIndex) => <option value={optionIndex} key={letter}>{letter}</option>)}</select></div>)}</div></section>}

      {format === "classification" && <section className="cg-admin-answer-builder"><strong>Classification key</strong><div className="cg-grid two"><div><label htmlFor="category-1">Category 1</label><input id="category-1" className="input" name="category1" defaultValue="Evidence" required /></div><div><label htmlFor="category-2">Category 2</label><input id="category-2" className="input" name="category2" defaultValue="Assumption" required /></div></div><div className="cg-grid two">{classification.map((value, index) => <div key={index}><label htmlFor={`classification-${index}`}>Option {String.fromCharCode(65 + index)} belongs to</label><select id={`classification-${index}`} className="input" value={value} onChange={(event) => setClassification((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}><option value="cat1">Category 1</option><option value="cat2">Category 2</option></select></div>)}</div></section>}

      <label htmlFor="challenge-explanation">Explanation</label><textarea id="challenge-explanation" className="input" name="explanation" rows={3} required />
      <label htmlFor="challenge-principle">Thinking principle</label><textarea id="challenge-principle" className="input" name="principle" rows={2} required />
      <label htmlFor="challenge-application">AI-age application</label><textarea id="challenge-application" className="input" name="application" rows={2} required />

      <button className="cg-button cg-full" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Publishing…" : "Create and publish challenge"}</button>
      {message && <p className="cg-form-message" aria-live="polite">{message}</p>}
      {error && <div className="cg-inline-error" role="alert">{error}</div>}
    </form>
  );
}
