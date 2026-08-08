"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AudienceSelector } from "@/components/AudienceSelector";
import type { AudienceSegment } from "@/lib/audience";

export function ProfileForm({
  initialName,
  initialIndustry,
  initialRole,
  initialAudience,
}: {
  initialName: string;
  initialIndustry: string;
  initialRole: string;
  initialAudience: AudienceSegment | null;
}) {
  const [name, setName] = useState(initialName);
  const [industry, setIndustry] = useState(initialIndustry);
  const [role, setRole] = useState(initialRole);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Your session has expired. Sign in again to update your profile.");
        return;
      }
      const { error: updateError } = await supabase.from("profiles").update({
        full_name: name.trim(),
        industry: industry.trim(),
        job_role: role.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (updateError) setError("Could not save your profile details. Try again.");
      else setMessage("Profile details saved.");
    } catch {
      setError("Connection interrupted. Try saving again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="cg-card cg-form-card" id="learning-context">
        <div className="cg-kicker">Learning context</div>
        <h2>Make training feel relevant</h2>
        <p>Change this whenever your context changes. It affects future lessons and questions only; your historical scores stay intact.</p>
        <AudienceSelector compact initialValue={initialAudience} />
      </section>

      <section className="cg-card cg-form-card">
        <div className="cg-kicker">Profile details</div>
        <form onSubmit={save}>
          <label htmlFor="profile-name">Name</label>
          <input id="profile-name" className="input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
          <label htmlFor="profile-industry">Industry <span className="cg-field-help">optional</span></label>
          <input id="profile-industry" className="input" value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Construction, finance, legal…" />
          <label htmlFor="profile-role">Role <span className="cg-field-help">optional</span></label>
          <input id="profile-role" className="input" autoComplete="organization-title" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Commercial director, analyst…" />
          <button type="submit" className="cg-button cg-full" style={{ marginTop: 18 }} disabled={busy}>{busy ? "Saving…" : "Save profile details"}</button>
          {message && <p className="cg-form-message" aria-live="polite">{message}</p>}
          {error && <div className="cg-inline-error" role="alert">{error}</div>}
        </form>
      </section>
    </>
  );
}
