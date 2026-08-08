"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AUDIENCE_SEGMENTS, type AudienceSegment } from "@/lib/audience";

export function AudienceSelector({
  initialValue,
  compact = false,
  nextHref = "/onboarding",
}: {
  initialValue?: AudienceSegment | null;
  compact?: boolean;
  nextHref?: string;
}) {
  const [selected, setSelected] = useState<AudienceSegment | null>(initialValue ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function save() {
    if (!selected || busy) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/profile/audience", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ audienceSegment: selected }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(body.error || "Could not save your learning context.");
      return;
    }
    if (compact) {
      setMessage("Learning context saved. Future lessons and sessions will use it.");
      router.refresh();
      return;
    }
    router.push(nextHref);
    router.refresh();
  }

  return (
    <section className={`cg-audience-selector ${compact ? "compact" : ""}`}>
      <div className="cg-audience-grid" role="radiogroup" aria-label="Learning context">
        {AUDIENCE_SEGMENTS.map((item) => {
          const active = selected === item.slug;
          return (
            <button
              key={item.slug}
              type="button"
              role="radio"
              aria-checked={active}
              className={`cg-audience-card ${active ? "selected" : ""}`}
              onClick={() => setSelected(item.slug)}
            >
              <span className="cg-audience-icon" aria-hidden="true">{item.icon}</span>
              <span className="cg-audience-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              <span className="cg-audience-check" aria-hidden="true">{active ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="cg-button cg-full" disabled={!selected || busy} onClick={save}>
        {busy ? "Saving your context…" : compact ? "Save learning context" : "Personalise my Cogni →"}
      </button>
      {message && <p className="cg-form-message" aria-live="polite">{message}</p>}
      <p className="cg-audience-note">This changes the situations and decision complexity Cogni uses—not how intelligent it assumes you are.</p>
    </section>
  );
}
