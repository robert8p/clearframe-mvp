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
  const [message, setMessage] = useState("");
  function toggleAudience(value: string) {
    if (value === "all") return setAudiences(["all"]);
    setAudiences((current) => {
      const next = current.filter((item) => item !== "all");
      return next.includes(value) ? next.filter((item) => item !== value) : [...next, value];
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("Saving…");
    const fd = new FormData(event.currentTarget);
    const payload = {
      title: fd.get("title"), subtitle: fd.get("subtitle"), emoji: fd.get("emoji"), skillSlug: fd.get("skill"),
      difficulty: Number(fd.get("difficulty")), estimatedMinutes: Number(fd.get("minutes")), scenarioContext: fd.get("scenario"), audienceSegments: audiences.length ? audiences : ["all"],
      content: { story: fd.get("story"), twist: fd.get("twist"), principle: fd.get("principle"), try_it: fd.get("try"), reveal: fd.get("reveal"), ai_age: fd.get("ai") },
    };
    const response = await fetch("/api/admin/lessons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json(); setMessage(response.ok ? "Lesson created and published." : body.error || "Failed");
    if (response.ok) event.currentTarget.reset();
  }
  return <form className="cg-card cg-admin-author" onSubmit={submit}><div className="cg-kicker">Lesson authoring</div><h2>Create daily lesson</h2><label>Title</label><input className="input" name="title" required/><label>Subtitle</label><input className="input" name="subtitle" required/><div className="cg-grid two"><div><label>Emoji</label><input className="input" name="emoji" defaultValue="🧠" required/></div><div><label>Difficulty</label><input className="input" name="difficulty" type="number" min="20" max="90" defaultValue="50" required/></div><div><label>Minutes</label><input className="input" name="minutes" type="number" min="1" max="10" defaultValue="3" required/></div><div><label>Skill</label><select className="input" name="skill">{skills.map(([slug,name]) => <option value={slug} key={slug}>{name}</option>)}</select></div></div><label>Scenario context</label><input className="input" name="scenario" placeholder="e.g. Executive • capital-allocation decision"/><label>Applicable audiences</label><div className="cg-admin-audience-picks"><button type="button" className={`cg-pill ${audiences.includes("all") ? "active" : ""}`} onClick={() => toggleAudience("all")}>All audiences</button>{AUDIENCE_SEGMENTS.map((item) => <button type="button" key={item.slug} className={`cg-pill ${audiences.includes(item.slug) ? "active" : ""}`} onClick={() => toggleAudience(item.slug)}>{item.icon} {item.shortLabel}</button>)}</div><label>Story / hook</label><textarea className="input" name="story" rows={3} required/><label>The twist</label><textarea className="input" name="twist" rows={2} required/><label>Thinking principle</label><textarea className="input" name="principle" rows={2} required/><label>Your-turn question</label><textarea className="input" name="try" rows={2} required/><label>Reveal</label><textarea className="input" name="reveal" rows={2} required/><label>Audience-specific AI-age application</label><textarea className="input" name="ai" rows={3} required/><button className="cg-button cg-full" style={{marginTop:18}}>Create and publish lesson</button>{message && <p aria-live="polite">{message}</p>}</form>;
}
