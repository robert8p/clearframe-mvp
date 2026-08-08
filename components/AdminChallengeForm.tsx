"use client";

import { FormEvent, useState } from "react";

export function AdminChallengeForm() {
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage("Saving…");
    const fd = new FormData(e.currentTarget);
    const payload = { title: fd.get("title"), prompt: fd.get("prompt"), options: [fd.get("a"), fd.get("b"), fd.get("c"), fd.get("d")], correctIndex: Number(fd.get("correct")), difficulty: Number(fd.get("difficulty")), skillSlug: fd.get("skill"), explanation: fd.get("explanation"), thinkingPrinciple: fd.get("principle"), application: fd.get("application") };
    const r = await fetch("/api/admin/challenges", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const b = await r.json(); setMessage(r.ok ? "Challenge created and published." : b.error || "Failed"); if (r.ok) e.currentTarget.reset();
  }
  return <form className="cg-card" onSubmit={submit}><h2>Create challenge</h2><label>Title</label><input className="input" name="title" required/><label>Prompt</label><textarea className="input" name="prompt" rows={4} required/><div className="cg-grid two"><div><label>Option A</label><input className="input" name="a" required/></div><div><label>Option B</label><input className="input" name="b" required/></div><div><label>Option C</label><input className="input" name="c" required/></div><div><label>Option D</label><input className="input" name="d" required/></div></div><div className="cg-grid two"><div><label>Correct option (0=A…3=D)</label><input className="input" name="correct" type="number" min="0" max="3" defaultValue="0" required/></div><div><label>Difficulty 20–90</label><input className="input" name="difficulty" type="number" min="20" max="90" defaultValue="50" required/></div></div><label>Primary skill slug</label><input className="input" name="skill" defaultValue="ai-output-verification" required/><label>Explanation</label><textarea className="input" name="explanation" rows={3} required/><label>Thinking principle</label><textarea className="input" name="principle" rows={2} required/><label>AI-era application</label><textarea className="input" name="application" rows={2} required/><button className="cg-button cg-full" style={{ marginTop: 18 }}>Create challenge</button>{message && <p>{message}</p>}</form>;
}
