type SkillShape = { name: string; slug: string } | { name: string; slug: string }[] | null;
type Row = { score: number; reliability: number; attempts?: number; skills: SkillShape };

function extractSkill(skill: SkillShape) {
  return Array.isArray(skill) ? skill[0] : skill;
}

export function SkillBars({ rows }: { rows: Row[] }) {
  return (
    <section className="cg-card">
      {rows.map((row, index) => {
        const skill = extractSkill(row.skills);
        const assessed = (row.attempts ?? 0) > 0;
        return (
          <div key={index} style={{ marginBottom: index === rows.length - 1 ? 0 : 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <div>
                <strong>{skill?.name ?? "Skill"}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {assessed ? `Reliability ${Math.round(row.reliability * 100)}%` : "Not yet measured"}
                </div>
              </div>
              <strong>{assessed ? Math.round(row.score) : "—"}</strong>
            </div>
            <div className="progress"><span style={{ width: `${assessed ? Math.round(row.score) : 0}%` }} /></div>
          </div>
        );
      })}
    </section>
  );
}
