export const AUDIENCE_SEGMENTS = [
  { slug:"university_student", label:"University student", shortLabel:"University", icon:"🎓", description:"Build stronger thinking for study, AI use and everyday decisions", complexityAnchor:42, homePromise:"Build the thinking skills that improve study, AI use and graduate readiness.", questionCount:5, sessionLabel:"Daily practice", outcome:"Sharper thinking built" },
  { slug:"graduate_early_career", label:"Graduate / early career", shortLabel:"Graduate / early career", icon:"🚀", description:"Build confidence with early-career decisions and evidence", complexityAnchor:48, homePromise:"Build the judgement that makes people trust your work.", questionCount:5, sessionLabel:"Workplace practice", outcome:"Professional judgement strengthened" },
  { slug:"junior_professional", label:"Junior professional", shortLabel:"Junior professional", icon:"💼", description:"Make stronger recommendations and challenge weak evidence", complexityAnchor:54, homePromise:"Turn analysis into stronger recommendations and decisions.", questionCount:5, sessionLabel:"Applied judgement", outcome:"Professional judgement strengthened" },
  { slug:"management", label:"Management", shortLabel:"Management", icon:"🧭", description:"Make clearer decisions about people, priorities and risk", complexityAnchor:61, homePromise:"Make clearer decisions about people, priorities, resources and risk.", questionCount:4, sessionLabel:"Management decisions", outcome:"Management judgement strengthened" },
  { slug:"executive", label:"Executive", shortLabel:"Executive", icon:"♟", description:"Strengthen strategic decisions when the answer is uncertain", complexityAnchor:68, homePromise:"Sharpen strategic judgement under uncertainty.", questionCount:3, sessionLabel:"Executive decisions", outcome:"Strategic judgement strengthened" },
] as const;
export type AudienceSegment = (typeof AUDIENCE_SEGMENTS)[number]["slug"];
export function isAudienceSegment(value: unknown): value is AudienceSegment { return AUDIENCE_SEGMENTS.some((item) => item.slug === value); }
export function audienceMeta(value: unknown) { return AUDIENCE_SEGMENTS.find((item) => item.slug === value) ?? null; }
export function audienceMatches(contentSegments: unknown, audience: AudienceSegment) { if (!Array.isArray(contentSegments) || contentSegments.length===0) return true; const values=contentSegments.map(String); return values.includes("all") || values.includes(audience); }
export function audienceDifficultyTarget(audience: AudienceSegment, measuredScore: number) { const anchor=audienceMeta(audience)?.complexityAnchor ?? 52; return Math.round(measuredScore*.68+anchor*.32); }
export function audienceQuestionCount(audience: AudienceSegment) { return audienceMeta(audience)?.questionCount ?? 5; }
export function audienceHomePromise(audience: AudienceSegment) { return audienceMeta(audience)?.homePromise ?? "Build clearer judgement for the decisions you face."; }
export function audienceSessionLabel(audience: AudienceSegment) { return audienceMeta(audience)?.sessionLabel ?? "Daily practice"; }
export function audienceOutcome(audience: AudienceSegment) { return audienceMeta(audience)?.outcome ?? "Judgement strengthened"; }
export function audienceTransferStatement(audience: AudienceSegment, skillName?: string) {
  const skill = skillName ? ` ${skillName.toLowerCase()}` : " this judgement skill";
  if (audience === "university_student") return `This helps you use${skill} in assignments, AI-assisted study, interviews and everyday decisions.`;
  if (audience === "graduate_early_career") return `This is the kind of${skill} that helps people trust your work before you have years of experience.`;
  if (audience === "junior_professional") return `This helps you use${skill} to make recommendations senior stakeholders can trust.`;
  if (audience === "management") return `This helps you use${skill} when decisions affect people, priorities, resources and knock-on consequences.`;
  return `This helps you use${skill} to identify which assumption, trade-off or risk deserves the most attention before a strategic commitment.`;
}
