type SkillShape = { name: string; slug: string } | { name: string; slug: string }[] | null;
type Row = { score: number; reliability: number; attempts?: number; skills: SkillShape };

function skillOf(value: SkillShape) { return Array.isArray(value) ? value[0] : value; }

export function SkillBars({ rows }: { rows: Row[] }) {
  if (!rows.length) return <section className="cg-card"><p>Complete the diagnostic to build your Cogni profile.</p></section>;

  return (
    <div className="cg-skill-list">
      {rows.map((row, index) => {
        const skill = skillOf(row.skills);
        const measured = (row.attempts ?? 0) > 0;
        return (
          <div className="cg-skill-card" key={index}>
            <div className="cg-skill-icon">{measured ? Math.round(row.score) : "?"}</div>
            <div className="cg-skill-copy">
              <div className="cg-skill-head">
                <strong>{skill?.name ?? "Skill"}</strong>
                <span>{measured ? `${Math.round(row.score)}%` : "Unmeasured"}</span>
              </div>
              <div className="progress"><span style={{ width: `${measured ? Math.round(row.score) : 0}%` }} /></div>
              <small>{measured ? `Evidence confidence ${Math.round(row.reliability * 100)}%` : "Cogni will explore this capability in future sessions."}</small>
            </div>
          </div>
        );
      })}
    </div>
  );
}
