"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({ initialName, initialIndustry, initialRole }: { initialName: string; initialIndustry: string; initialRole: string }) {
  const [name, setName] = useState(initialName);
  const [industry, setIndustry] = useState(initialIndustry);
  const [role, setRole] = useState(initialRole);
  const [message, setMessage] = useState("");

  async function save() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ full_name: name, industry, job_role: role }).eq("id", user.id);
    setMessage(error ? error.message : "Profile saved.");
  }

  return (
    <section className="cg-card cg-form-card">
      <label>Name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      <label>Industry <span className="muted">optional</span></label>
      <input className="input" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Construction, finance, legal…" />
      <label>Role <span className="muted">optional</span></label>
      <input className="input" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Commercial director, analyst…" />
      <button className="cg-button" style={{ width: "100%", marginTop: 18 }} onClick={save}>Save profile</button>
      {message && <p className="cg-form-message">{message}</p>}
    </section>
  );
}
