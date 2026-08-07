"use client";
import{useEffect,useState}from"react";
export function CoachCard(){const[insight,setInsight]=useState("Analysing your current evidence…");useEffect(()=>{fetch("/api/coach").then(r=>r.json()).then(b=>setInsight(b.insight??"Complete more challenges to unlock a grounded coaching insight.")).catch(()=>setInsight("Complete more challenges to build your coaching insight."));},[]);return <section className="card" style={{marginTop:16}}><div className="kicker">Coach insight</div><h2 style={{marginTop:8}}>What to notice this week</h2><p>{insight}</p></section>}
