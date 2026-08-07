type SkillShape = { name: string; slug: string } | { name: string; slug: string }[] | null;
type Row = { score: number; reliability: number; attempts?: number; skills: SkillShape };

function extractSkill(skill: SkillShape) {
  return Array.isArray(skill) ? skill[0] : skill;
}

export function SkillBars({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return (
      <section className="card">
        <p className="muted">Complete the diagnostic to build your Cogni profile.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="grid">
        {rows.map((row, index) => {
          const skill = extractSkill(row.skills);
          const assessed = (row.attempts ?? 0) > 0;
          const scoreWidth = assessed ? Math.round(row.score) : 0;

          return (
            <div key={index} className="skill-row">
              <div className="skill-meta">
                <div>
                  <div className="skill-name">{skill?.name ?? "Skill"}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {assessed
                      ? `Reliability ${Math.round(row.reliability * 100)}%`
                      : "Not yet measured"}
                  </div>
                </div>
                <div className="mono" style={{ fontWeight: 750 }}>
                  {assessed ? Math.round(row.score) : "—"}
                </div>
              </div>
              <div className="progress">
                <span style={{ width: `${scoreWidth}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
