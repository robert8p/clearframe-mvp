export const MOBILE_AUDIENCES = [
  { slug: "casual", icon: "🌱", label: "Casual / personal growth", shortLabel: "Everyday learner", text: "Curiosity-led practice for everyday choices, online information and AI", promise: "Build sharper judgement for everyday choices, online information and AI." },
  { slug: "university_student", icon: "🎓", label: "University student", shortLabel: "University", text: "Sharper thinking for study, AI use and the move into work", promise: "Build the thinking skills that improve study, AI use and graduate readiness." },
  { slug: "graduate_early_career", icon: "🚀", label: "Graduate / early career", shortLabel: "Graduate / early career", text: "Build the judgement that makes people trust your work", promise: "Build the judgement that makes people trust your work." },
  { slug: "junior_professional", icon: "💼", label: "Junior professional", shortLabel: "Junior professional", text: "Turn analysis into stronger recommendations and decisions", promise: "Turn analysis into stronger recommendations and decisions." },
  { slug: "management", icon: "🧭", label: "Management", shortLabel: "Management", text: "Make clearer decisions about people, priorities, resources and risk", promise: "Make clearer decisions about people, priorities, resources and risk." },
  { slug: "executive", icon: "♟", label: "Executive", shortLabel: "Executive", text: "Sharpen strategic judgement under uncertainty", promise: "Sharpen strategic judgement under uncertainty." },
] as const;

export type MobileAudience = (typeof MOBILE_AUDIENCES)[number]["slug"];

export function isMobileAudience(value: unknown): value is MobileAudience {
  return MOBILE_AUDIENCES.some((item) => item.slug === value);
}

export function mobileAudienceMeta(value: unknown) {
  return MOBILE_AUDIENCES.find((item) => item.slug === value) ?? null;
}
