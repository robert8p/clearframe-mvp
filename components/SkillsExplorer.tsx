"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SkillShape = { name: string; slug: string } | { name: string; slug: string }[] | null;
type Row = { score: number; reliability: number; attempts?: number; skills: SkillShape };

function skillOf(value: SkillShape) { return Array.isArray(value) ? value[0] : value; }

export function SkillsExplorer({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "measured" | "unmeasured">("all");
  const measured = rows.filter((row) => (row.attempts ?? 0) > 0).length;
  const unmeasured = rows.length - measured;

  const visible = useMemo(() => rows.filter((row) => {
    const skill = skillOf(row.skills);
    const matchesText = !query.trim() || (skill?.name ?? "").toLowerCase().includes(query.trim().toLowerCase());
    const isMeasured = (row.attempts ?? 0) > 0;
    const matchesFilter = filter === "all" || (filter === "measured" ? isMeasured : !isMeasured);
    return matchesText && matchesFilter;
  }), [rows, query, filter]);

  return (
    <>
      <label className="cg-search-control">
        <span aria-hidden="true">⌕</span>
        <input className="input" value={query} onChange={(event: { target: { value: string } }) => setQuery(event.target.value)} placeholder="Search skills…" aria-label="Search skills" />
      </label>
      <div className="badge-row" role="group" aria-label="Filter skills">
        <button type="button" className={`cg-pill ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All {rows.length}</button>
        <button type="button" className={`cg-pill ${filter === "measured" ? "active" : ""}`} onClick={() => setFilter("measured")}>Started {measured}</button>
        <button type="button" className={`cg-pill ${filter === "unmeasured" ? "active" : ""}`} onClick={() => setFilter("unmeasured")}>Not yet tested {unmeasured}</button>
      </div>
      <div className="cg-skill-list">
        {visible.map((row, index) => {
          const skill = skillOf(row.skills);
          const measuredRow = (row.attempts ?? 0) > 0;
          return (
            <Link className="cg-skill-card cg-skill-link" href={skill?.slug ? `/skills/${skill.slug}` : "/skills"} key={skill?.slug ?? index}>
              <div className="cg-skill-icon">{measuredRow ? Math.round(row.score) : "?"}</div>
              <div className="cg-skill-copy">
                <div className="cg-skill-head"><strong>{skill?.name ?? "Skill"}</strong><span>{measuredRow ? `${Math.round(row.score)}/100` : "Not yet tested"}</span></div>
                <div className="progress" aria-label={measuredRow ? `Skill score ${Math.round(row.score)} out of 100` : "Not yet tested"}><span style={{ width: `${measuredRow ? Math.round(row.score) : 0}%` }} /></div>
                <small>{measuredRow ? `Evidence level ${Math.round(row.reliability * 100)}%` : "You’ll see this skill in future sessions."}</small>
              </div>
              <span className="cg-card-chevron" aria-hidden="true">›</span>
            </Link>
          );
        })}
      </div>
      {!visible.length && <section className="cg-card"><p>No skills match that search.</p><button type="button" className="cg-button secondary cg-full" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button></section>}
    </>
  );
}
