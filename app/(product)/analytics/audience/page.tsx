import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCE_SEGMENTS } from "@/lib/audience";

type Profile={id:string;audience_segment:string|null;function_area:string|null;industry:string|null;primary_goal:string|null;current_streak:number|null;created_at:string};
type Feedback={user_id:string;audience_segment:string|null;relevance_rating:string|null;relevance_reason:string|null;difficulty_feedback:string|null;function_area:string|null;industry:string|null;primary_goal:string|null;created_at:string};
type Event={user_id:string|null;event_name:string;properties:Record<string,unknown>|null;created_at:string};
type Session={user_id:string;status:string;created_at:string};
type LessonCompletion={user_id:string;completed_at:string};
type Challenge={id:string;audience_segments:string[];scenario_category:string|null;challenge_type:string;interaction_type:string;is_diagnostic:boolean};

const positive=(value:string|null)=>value==="very_relevant"||value==="mostly_relevant";
const pct=(n:number,d:number)=>d?Math.round(n/d*100):null;
const label=(value:number|null)=>value===null?"Collecting":`${value}%`;
function props(event:Event){return event.properties&&typeof event.properties==="object"?event.properties:{}}
function propString(event:Event,key:string){const value=props(event)[key];return typeof value==="string"?value:null}
function day(value:string){return value.slice(0,10)}
function addDays(value:string,n:number){const d=new Date(`${value}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function uniqueUsers(events:Event[]){return new Set(events.map(event=>event.user_id).filter((id):id is string=>Boolean(id))).size}
function retention(opens:Event[],ids:Set<string>,days:number){const by=new Map<string,Set<string>>();for(const event of opens){if(!event.user_id||!ids.has(event.user_id))continue;const set=by.get(event.user_id)??new Set<string>();set.add(day(event.created_at));by.set(event.user_id,set)}let eligible=0,returned=0;const today=day(new Date().toISOString());for(const dates of by.values()){const first=[...dates].sort()[0];if(!first)continue;const elapsed=Math.floor((Date.parse(`${today}T00:00:00Z`)-Date.parse(`${first}T00:00:00Z`))/86400000);if(elapsed<days)continue;eligible++;if(dates.has(addDays(first,days)))returned++}return{eligible,returned,rate:pct(returned,eligible)}}
function formatLabel(value:string){return({single_choice:"Choose one",multi_select:"Multi-select",ranking:"Ranking",classification:"Sorting",triage:"Decision"}as Record<string,string>)[value]??value.replaceAll("_"," ")}

export default async function AudienceAnalyticsPage(){
  await requireAdmin();
  const admin=createAdminClient(),since=new Date(Date.now()-120*86400000).toISOString(),since30=new Date(Date.now()-30*86400000).toISOString();
  const[profileResult,sessionResult,feedbackResult,eventResult,challengeResult,lessonResult]=await Promise.all([
    admin.from("profiles").select("id,audience_segment,function_area,industry,primary_goal,current_streak,created_at").limit(20000),
    admin.from("training_sessions").select("user_id,status,created_at").gte("created_at",since30).limit(20000),
    admin.from("session_feedback").select("user_id,audience_segment,relevance_rating,relevance_reason,difficulty_feedback,function_area,industry,primary_goal,created_at").gte("created_at",since).limit(20000),
    admin.from("analytics_events").select("user_id,event_name,properties,created_at").gte("created_at",since).limit(50000),
    admin.from("challenges").select("id,audience_segments,scenario_category,challenge_type,interaction_type,is_diagnostic").eq("is_published",true).limit(5000),
    admin.from("user_lesson_completions").select("user_id,completed_at").gte("completed_at",since30).limit(20000),
  ]);
  const profiles=(profileResult.data??[])as Profile[],sessions=(sessionResult.data??[])as Session[],feedback=(feedbackResult.data??[])as Feedback[],events=(eventResult.data??[])as Event[],challenges=(challengeResult.data??[])as Challenge[],lessonCompletions=(lessonResult.data??[])as LessonCompletion[];
  const profileById=new Map(profiles.map(profile=>[profile.id,profile]));
  const challengeById=new Map(challenges.map(challenge=>[challenge.id,challenge]));
  const audienceAtEvent=(event:Event)=>propString(event,"audience_segment")??(event.user_id?profileById.get(event.user_id)?.audience_segment:null)??null;
  const opens=events.filter(event=>event.event_name==="app_opened");
  const recentEvents=events.filter(event=>event.created_at>=since30);

  const rows=AUDIENCE_SEGMENTS.map(meta=>{
    const users=profiles.filter(profile=>profile.audience_segment===meta.slug),ids=new Set(users.map(profile=>profile.id));
    const audienceEvents=recentEvents.filter(event=>audienceAtEvent(event)===meta.slug);
    const context=users.filter(profile=>Boolean(profile.function_area||profile.industry||profile.primary_goal)).length;
    const audienceFeedback=feedback.filter(item=>item.audience_segment===meta.slug&&item.relevance_rating);
    const relevant=audienceFeedback.filter(item=>positive(item.relevance_rating)).length;
    const created=sessions.filter(session=>ids.has(session.user_id)),completed=created.filter(session=>session.status==="completed");
    const lessonComplete=lessonCompletions.filter(item=>ids.has(item.user_id)).length;
    const practiceStarts=audienceEvents.filter(event=>event.event_name==="practice_started");
    const onboarding=events.filter(event=>event.event_name==="onboarding_completed"&&audienceAtEvent(event)===meta.slug);
    const diagnostic=events.filter(event=>event.event_name==="diagnostic_completed"&&audienceAtEvent(event)===meta.slug);
    const r1=retention(opens,ids,1),r7=retention(opens,ids,7),r30=retention(opens,ids,30);
    const specific=challenges.filter(challenge=>!challenge.is_diagnostic&&challenge.audience_segments?.includes(meta.slug));
    const categories=new Map<string,number>();for(const challenge of specific){const key=challenge.scenario_category||"Uncategorised";categories.set(key,(categories.get(key)??0)+1)}const max=[...categories.values()].sort((a,b)=>b-a)[0]??0;

    const viewed=audienceEvents.filter(event=>event.event_name==="challenge_viewed");
    const answered=audienceEvents.filter(event=>event.event_name==="explanation_viewed");
    const viewKeys=new Set(viewed.map(event=>`${event.user_id}:${propString(event,"session_id")}:${propString(event,"challenge_id")}`));
    const answerKeys=new Set(answered.map(event=>`${event.user_id}:${propString(event,"session_id")}:${propString(event,"challenge_id")}`));
    const abandoned=[...viewKeys].filter(key=>!answerKeys.has(key)).length;
    const formatCounts=new Map<string,number>();for(const event of answered){const format=propString(event,"interaction_type")??"unknown";formatCounts.set(format,(formatCounts.get(format)??0)+1)}

    const userScenarioCounts=new Map<string,number>();let scenarioViews=0;for(const event of viewed){const challengeId=propString(event,"challenge_id"),scenario=challengeId?challengeById.get(challengeId)?.scenario_category:null;if(!event.user_id||!scenario)continue;scenarioViews++;const key=`${event.user_id}:${scenario}`;userScenarioCounts.set(key,(userScenarioCounts.get(key)??0)+1)}const scenarioRepeats=[...userScenarioCounts.values()].reduce((sum,count)=>sum+Math.max(0,count-1),0);
    const activeStreak=users.filter(user=>Number(user.current_streak??0)>=2).length;
    const tooBasic=audienceFeedback.filter(item=>item.difficulty_feedback==="too_basic").length,tooAdvanced=audienceFeedback.filter(item=>item.difficulty_feedback==="too_advanced").length;
    return{
      meta,users:users.length,contextPct:pct(context,users.length),onboarding:uniqueUsers(onboarding),diagnostic:uniqueUsers(diagnostic),sessionPct:pct(completed.length,created.length),lessonComplete,
      practice:practiceStarts.length,relevanceN:audienceFeedback.length,relevancePct:pct(relevant,audienceFeedback.length),tooBasic,tooAdvanced,r1,r7,r30,categories:categories.size,maxCategoryPct:pct(max,specific.length),
      avgStreak:users.length?Math.round(users.reduce((sum,user)=>sum+Number(user.current_streak??0),0)/users.length):0,streakPct:pct(activeStreak,users.length),abandonPct:pct(abandoned,viewKeys.size),scenarioRepeatPct:pct(scenarioRepeats,scenarioViews),formats:[...formatCounts.entries()].sort((a,b)=>b[1]-a[1]),
    };
  });

  const changes=events.filter(event=>event.event_name==="audience_changed").length,contextUpdates=events.filter(event=>event.event_name==="context_profile_updated").length;
  const reasonCounts=new Map<string,number>();for(const item of feedback)if(item.relevance_reason)reasonCounts.set(item.relevance_reason,(reasonCounts.get(item.relevance_reason)??0)+1);
  const groupFeedback=(key:"function_area"|"industry"|"primary_goal")=>{const map=new Map<string,{n:number;positive:number}>();for(const item of feedback){const value=item[key];if(!value||!item.relevance_rating)continue;const current=map.get(value)??{n:0,positive:0};current.n++;if(positive(item.relevance_rating))current.positive++;map.set(value,current)}return[...map.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0,12)};
  const functionFeedback=groupFeedback("function_area"),industryFeedback=groupFeedback("industry"),goalFeedback=groupFeedback("primary_goal");

  return <div className="cg-analytics-page">
    <div className="cg-kicker">Audience quality</div><h1>Does Cogni feel designed for each learner?</h1>
    <p className="cg-analytics-intro">Target: ≥80% “very” or “mostly” relevant once an audience has at least 10 relevance responses. Small samples stay visible rather than being treated as proof.</p>
    <div className="cg-analytics-metrics"><section className="cg-card cg-analytics-metric"><div className="cg-kicker">Audience changes</div><div className="cg-stat">{changes}</div><p>Stage changes preserve history.</p></section><section className="cg-card cg-analytics-metric"><div className="cg-kicker">Context updates</div><div className="cg-stat">{contextUpdates}</div><p>Function / industry / goal saves.</p></section><section className="cg-card cg-analytics-metric"><div className="cg-kicker">Relevance responses</div><div className="cg-stat">{feedback.filter(item=>item.relevance_rating).length}</div><p>Evidence against the 80% target.</p></section></div>

    <section className="cg-card"><div className="cg-section-head flush"><h2>Audience health</h2><Link href="/analytics">Engagement dashboard →</Link></div><div className="cg-admin-table-wrap"><table className="table"><thead><tr><th>Audience</th><th>Users</th><th>Onboarding / check</th><th>Context set</th><th>Daily / lesson</th><th>Relevance</th><th>D1 / D7 / D30</th><th>Streak</th><th>Abandon</th><th>Scenario repeats</th><th>Scenarios</th><th>Extra practice</th></tr></thead><tbody>{rows.map(row=><tr key={row.meta.slug}><td><strong>{row.meta.shortLabel}</strong><small className="cg-table-sub">{row.tooBasic} too basic · {row.tooAdvanced} too advanced</small></td><td>{row.users}</td><td>{row.onboarding} / {row.diagnostic}</td><td>{label(row.contextPct)}</td><td>{label(row.sessionPct)}<small className="cg-table-sub">{row.lessonComplete} lessons / 30d</small></td><td><strong className={row.relevanceN>=10&&(row.relevancePct??0)<80?"cg-qa-warn":""}>{label(row.relevancePct)}</strong><small className="cg-table-sub">n={row.relevanceN}</small></td><td>{label(row.r1.rate)} / {label(row.r7.rate)} / {label(row.r30.rate)}</td><td>{label(row.streakPct)}<small className="cg-table-sub">avg {row.avgStreak}d</small></td><td>{label(row.abandonPct)}</td><td>{label(row.scenarioRepeatPct)}</td><td>{row.categories}<small className="cg-table-sub">max pool {label(row.maxCategoryPct)}</small></td><td>{row.practice}</td></tr>)}</tbody></table></div></section>

    <section className="cg-card"><div className="cg-section-head flush"><h2>Question-format engagement by audience</h2><span className="cg-pill">answered / 30d</span></div><div className="cg-audience-format-grid">{rows.map(row=><div className="cg-audience-format-row" key={row.meta.slug}><strong>{row.meta.shortLabel}</strong><div>{row.formats.length?row.formats.map(([format,count])=><span className="cg-pill" key={format}>{formatLabel(format)} {count}</span>):<span className="muted">Collecting</span>}</div></div>)}</div></section>

    <div className="cg-grid two cg-analytics-two"><section className="cg-card"><div className="cg-section-head flush"><h2>Why content felt irrelevant</h2><span className="cg-pill">120d</span></div>{reasonCounts.size?[...reasonCounts.entries()].sort((a,b)=>b[1]-a[1]).map(([reason,count])=><div className="cg-pattern-row" key={reason}><strong>{reason.replaceAll("_"," ")}</strong><span className="cg-pill">{count}</span></div>):<p>No “not very relevant” reasons yet.</p>}</section><section className="cg-card"><div className="cg-section-head flush"><h2>Relevance by function / study area</h2><span className="cg-pill">when provided</span></div>{functionFeedback.length?functionFeedback.map(([key,value])=><div className="cg-pattern-row" key={key}><strong>{key.replaceAll("_"," ")}</strong><span>{label(pct(value.positive,value.n))} · n={value.n}</span></div>):<p>Collecting function-level feedback.</p>}</section></div>
    <div className="cg-grid two cg-analytics-two"><section className="cg-card"><div className="cg-section-head flush"><h2>Relevance by industry</h2><span className="cg-pill">when provided</span></div>{industryFeedback.length?industryFeedback.map(([key,value])=><div className="cg-pattern-row" key={key}><strong>{key.replaceAll("_"," ")}</strong><span>{label(pct(value.positive,value.n))} · n={value.n}</span></div>):<p>Collecting industry-level feedback.</p>}</section><section className="cg-card"><div className="cg-section-head flush"><h2>Relevance by goal</h2><span className="cg-pill">when provided</span></div>{goalFeedback.length?goalFeedback.map(([key,value])=><div className="cg-pattern-row" key={key}><strong>{key.replaceAll("_"," ")}</strong><span>{label(pct(value.positive,value.n))} · n={value.n}</span></div>):<p>Collecting goal-level feedback.</p>}</section></div>
    <section className="cg-card cg-analytics-principle"><div className="cg-kicker">Content-quality rule</div><h2>Relevance is a release metric, not a copywriting opinion.</h2><p>Investigate an audience when relevance is below 80% with a meaningful sample, abandonment rises, “wrong context / repetitive” feedback clusters, or one scenario family begins to dominate real usage.</p></section>
  </div>;
}
