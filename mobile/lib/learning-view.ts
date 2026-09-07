import type { SkillScore, TodayResponse } from "./types";
export function boundedScore(value: unknown): number {
  const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}
export function evidenceLabel(row: Pick<SkillScore, "attempts" | "reliability">) {
  if (!Number.isFinite(Number(row.attempts)) || Number(row.attempts) <= 0) return "Not measured yet";
  const r = Number(row.reliability);
  return r >= 0.7 ? "More evidence" : r >= 0.35 ? "Building evidence" : "Early evidence";
}
export function skillDetails(row: SkillScore) { return Array.isArray(row.skills) ? row.skills[0] : row.skills; }
export function selectSkills(rows: SkillScore[], query = "", filter: "all" | "practised" | "new" = "all") {
  const q = query.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    const skill = skillDetails(row);
    const measured = Number(row.attempts) > 0;
    return (filter === "all" || (filter === "practised" ? measured : !measured)) &&
      (!q || `${skill?.name ?? ""} ${skill?.description ?? ""}`.toLocaleLowerCase().includes(q));
  }).sort((a,b) => (Number(b.attempts) > 0 ? 1 : 0) - (Number(a.attempts) > 0 ? 1 : 0) || boundedScore(a.score)-boundedScore(b.score) || (skillDetails(a)?.name ?? "").localeCompare(skillDetails(b)?.name ?? ""));
}
export function trainingPresentation(today: TodayResponse | null) {
  const questions = today?.state === "diagnostic" ? today.challenges ?? [] : today?.session?.challenges ?? [];
  const ids = new Set(questions.map(q => q.id));
  const answered = new Set((today?.state === "diagnostic" ? today.answeredChallengeIds : today?.session?.answeredChallengeIds) ?? []);
  const done = [...answered].filter(id => ids.has(id)).length;
  const total = questions.length;
  const progress = total ? done / total * 100 : null;
  switch(today?.state) {
    case "diagnostic": return { eyebrow:"Your starting check", title:done ? "Pick up where you left off" : "Find your starting point", body:"A few decisions to help personalise your practice. No pass or fail.", detail:total ? `${done} of ${total} answered · at your own pace` : "Your starting check is being prepared", progress };
    case "lesson": return { eyebrow:today.modeLabel ?? "Today’s insight", title:today.lesson?.title ?? "One idea. A fresh perspective.", body:today.lesson?.subtitle ?? "Read a short insight, then put it into practice.", detail:"Insight first. Practice next.", progress:null };
    case "training": return { eyebrow:today.modeLabel ?? "Today’s practice", title:done ? "Pick up where you left off" : "Train your thinking", body:"Make a decision. Explore the reasoning. Take something useful into your day.", detail:total ? `${done} of ${total} answered · at your own pace` : "Your next practice session", progress };
    case "complete": return { eyebrow:"Daily goal complete", title:"A little practice. A clearer perspective.", body:"Your core training is complete. Take a break, or choose a skill for another round.", detail:"Your answers are saved", progress:100 };
    default: return { eyebrow:"Today’s practice", title:"Let’s get you back on track", body:today?.message ?? "We couldn’t prepare your session. Check your connection and try again.", detail:"Your saved progress stays safe", progress:null };
  }
}
export type HistoryPoint = { date:string; skillId:string; skillName:string; score:number; reliability:number; attempts:number; skillSlug:string|null };
export function historyTrends(points: HistoryPoint[]) {
  const grouped = new Map<string, Map<string, HistoryPoint>>();
  for(const point of points) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(point.date) || !Number.isFinite(Number(point.score))) continue;
    const days = grouped.get(point.skillId) ?? new Map<string, HistoryPoint>();
    days.set(point.date.slice(0,10),point); grouped.set(point.skillId,days);
  }
  return [...grouped.entries()].flatMap(([skillId,days]) => {
    const sorted = [...days.values()].sort((a,b) => a.date.localeCompare(b.date));
    if(sorted.length < 2) return [];
    const first = sorted[0], last = sorted[sorted.length-1];
    return [{skillId,skillName:last.skillName,from:boundedScore(first.score),to:boundedScore(last.score),delta:Math.round((boundedScore(last.score)-boundedScore(first.score))*10)/10,observations:sorted.length,points:sorted}];
  }).sort((a,b) => Math.abs(b.delta)-Math.abs(a.delta)).slice(0,6);
}
