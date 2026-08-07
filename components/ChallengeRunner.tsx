"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnswerResult, Challenge } from "@/lib/types";

export function ChallengeRunner({ challenges, mode }: { challenges: Challenge[]; mode: "diagnostic" | "training" }) {
  const [index,setIndex]=useState(0); const [selected,setSelected]=useState<number|null>(null);
  const [confidence,setConfidence]=useState(60); const [result,setResult]=useState<AnswerResult|null>(null);
  const [busy,setBusy]=useState(false); const [startedAt,setStartedAt]=useState(()=>Date.now()); const [sessionId]=useState(()=>crypto.randomUUID());
  const router=useRouter(); const challenge=challenges[index];
  const progress=useMemo(()=>Math.round((index/challenges.length)*100),[index,challenges.length]);

  useEffect(()=>{ void fetch("/api/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:mode==="diagnostic"?"diagnostic_started":"session_started",properties:{session_id:sessionId}})}); },[mode,sessionId]);
  useEffect(()=>{ if(challenge) void fetch("/api/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:"challenge_viewed",properties:{session_id:sessionId,challenge_id:challenge.id,index}})}); },[challenge?.id,index,sessionId]);

  if (!challenge) return <section className="card"><h2>No challenges available</h2><p className="muted">Run the seed migration, then refresh this page.</p></section>;

  async function submit(){
    if(selected===null)return; setBusy(true);
    const res=await fetch("/api/answer",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({challengeId:challenge.id,selectedIndex:selected,confidence,responseTimeMs:Date.now()-startedAt,mode,sessionId})});
    const body=await res.json(); setBusy(false);
    if(!res.ok){alert(body.error||"Could not submit answer");return;} setResult(body);
  }
  function next(){
    if(index===challenges.length-1){ void fetch("/api/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:mode==="diagnostic"?"diagnostic_completed":"session_completed",properties:{session_id:sessionId}})}); router.push(mode==="diagnostic"?"/diagnostic/results":"/session-complete");router.refresh();return;}
    setIndex(i=>i+1);setSelected(null);setResult(null);setConfidence(60);setStartedAt(Date.now());
  }

  return <div style={{maxWidth:760,margin:"0 auto"}}>
    <div className="topbar"><div><div className="kicker">{mode} · {index+1} of {challenges.length}</div></div><span className="pill">Difficulty {challenge.difficulty}/100</span></div>
    <div className="progress" style={{marginBottom:20}}><span style={{width:`${progress}%`}} /></div>
    <section className="card">
      <div className="kicker">{challenge.challenge_type.replaceAll("_"," ")}</div><h2 style={{fontSize:26,marginTop:8}}>{challenge.title}</h2>
      <p style={{fontSize:17}}>{challenge.prompt}</p>
      <div>{challenge.options.map((option,i)=>{
        let c="option"; if(selected===i)c+=" selected"; if(result && i===result.correctIndex)c+=" correct"; if(result && selected===i && !result.correct)c+=" incorrect";
        return <button disabled={Boolean(result)} className={c} key={i} onClick={()=>setSelected(i)}><strong>{String.fromCharCode(65+i)}.</strong> {option}</button>;
      })}</div>
      {challenge.confidence_required && !result && <div style={{marginTop:18}}><label>How confident are you? {confidence}%</label><input style={{width:"100%"}} type="range" min="20" max="100" step="10" value={confidence} onChange={e=>setConfidence(Number(e.target.value))}/></div>}
      {!result ? <button className="button" style={{marginTop:20}} disabled={selected===null||busy} onClick={submit}>{busy?"Checking…":"Submit answer"}</button> :
        <div style={{marginTop:22}} onMouseEnter={()=>{void fetch("/api/event",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({eventName:"explanation_viewed",properties:{session_id:sessionId,challenge_id:challenge.id}})});}}>
          <div className="callout"><strong>{result.correct?"Correct":"Not quite"}.</strong> {result.explanation}</div>
          <h3>Thinking principle</h3><p>{result.thinkingPrinciple}</p>
          <h3>AI-era application</h3><p className="muted">{result.application}</p>
          {result.errorPattern && !result.correct && <p><span className="pill">Likely pattern: {result.errorPattern.replaceAll("_"," ")}</span></p>}
          <button className="button" onClick={next}>{index===challenges.length-1?"See results":"Next challenge"}</button>
        </div>}
    </section>
  </div>;
}
