type Row={score:number;reliability:number;skills:{name:string;slug:string}|{name:string;slug:string}[]|null};
export function SkillBars({rows}:{rows:Row[]}){
  if(!rows.length)return <section className="card"><p className="muted">Complete the diagnostic to build your profile.</p></section>;
  return <section className="card"><div className="grid">{rows.map((r,i)=>{const s=Array.isArray(r.skills)?r.skills[0]:r.skills;return <div key={i}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><strong>{s?.name??"Skill"}</strong><span>{Math.round(r.score)} <small className="muted">· reliability {Math.round(r.reliability*100)}%</small></span></div><div className="progress" style={{marginTop:8}}><span style={{width:`${r.score}%`}}/></div></div>})}</div></section>
}
