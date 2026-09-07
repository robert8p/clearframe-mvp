"use client";
import { useRef, useState, type KeyboardEvent } from "react";
const choices = ["Trust it because the answer sounds confident.","Ask another AI tool whether it agrees.","Check the original evidence and its context."];
export function PracticePreview() {
  const [selected,setSelected]=useState<number|null>(null);
  const [checked,setChecked]=useState(false);
  const options = useRef<(HTMLButtonElement|null)[]>([]);
  function navigateOption(event:KeyboardEvent<HTMLButtonElement>,index:number) {
    if(checked) return;
    const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? (index+1)%choices.length
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (index+choices.length-1)%choices.length
      : event.key === "Home" ? 0 : event.key === "End" ? choices.length-1 : null;
    if(next === null) return;
    event.preventDefault(); setSelected(next); options.current[next]?.focus();
  }
  return <div className="cg-practice-demo">
    <div className="cg-demo-meta"><span>TRY A DECISION</span><span>Example · not scored</span></div>
    <h2>Confidence isn’t evidence.</h2>
    <p>An AI tool gives you a striking statistic without a source. What is the strongest next step?</p>
    <div role="radiogroup" aria-label="Example answer" className="cg-demo-options">{choices.map((choice,index)=><button ref={element=>{options.current[index]=element;}} type="button" role="radio" aria-checked={selected===index} tabIndex={index===(selected ?? 0) ? 0 : -1} disabled={checked} className={`cg-demo-option${selected===index ? " selected" : ""}${checked&&index===2 ? " correct" : ""}`} key={choice} onKeyDown={event=>navigateOption(event,index)} onClick={()=>setSelected(index)}><span aria-hidden="true">{checked&&index===2 ? "✓" : String.fromCharCode(65+index)}</span><span>{choice}</span></button>)}</div>
    {!checked ? <button type="button" className="cg-button cg-full" disabled={selected===null} onClick={()=>{if(selected!==null)setChecked(true);}}>Check my thinking</button> : <div className="cg-demo-feedback" role="status"><strong>{selected===2 ? "That’s the strongest next step." : "Look for the evidence behind the answer."}</strong><p>Confident language and agreement between tools do not verify a claim. Trace it to the original source, then check whether the evidence supports it.</p><button type="button" className="cg-demo-reset" onClick={()=>{setChecked(false);setSelected(null);requestAnimationFrame(()=>options.current[0]?.focus());}}>Try the example again</button></div>}
    <p className="cg-demo-note">A local example only. No account, saved score or AI request.</p>
  </div>;
}
