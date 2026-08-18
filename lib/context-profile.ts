import type { AudienceSegment } from "@/lib/audience";

export type ContextProfile = {
  functionArea: string | null;
  industry: string | null;
  primaryGoal: string | null;
  studyStage: string | null;
  roleFocus: string | null;
  responsibilityScope: string | null;
  organisationScale: string | null;
};

export type ContextMoment = {
  localHour: number;
  localMinute: number;
  localWeekday: number;
};

export type ContextMode = "work" | "mixed" | "personal";
export type ContextOption = { value: string; label: string };

export const INDUSTRY_OPTIONS: ContextOption[] = [
  { value: "", label: "Not specified" },
  { value: "construction_real_estate", label: "Construction / real estate" },
  { value: "technology", label: "Technology" },
  { value: "financial_services", label: "Financial services" },
  { value: "professional_services", label: "Professional services" },
  { value: "consumer_retail", label: "Consumer / retail" },
  { value: "healthcare", label: "Healthcare" },
  { value: "public_sector", label: "Public sector" },
  { value: "education", label: "Education" },
  { value: "manufacturing_industrial", label: "Manufacturing / industrial" },
  { value: "media_creative", label: "Media / creative" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const CASUAL_INTERESTS: ContextOption[] = [
  { value: "", label: "Not specified" },
  { value: "everyday_decisions", label: "Everyday decisions" },
  { value: "news_media", label: "News, media & online information" },
  { value: "technology_ai", label: "Technology & AI" },
  { value: "money_purchases", label: "Money, purchases & reviews" },
  { value: "health_wellbeing", label: "Health & wellbeing information" },
  { value: "relationships_communication", label: "Relationships & communication" },
  { value: "travel_planning", label: "Travel & planning" },
  { value: "community_civic", label: "Community & civic issues" },
  { value: "personal_growth", label: "Personal growth & habits" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const PROFESSIONAL_FUNCTIONS: ContextOption[] = [
  { value: "", label: "Not specified" },
  { value: "finance_commercial", label: "Finance / commercial" },
  { value: "technology_engineering", label: "Technology / engineering" },
  { value: "marketing", label: "Marketing" },
  { value: "people_hr", label: "People / HR" },
  { value: "operations", label: "Operations / delivery" },
  { value: "sales_client", label: "Sales / client-facing" },
  { value: "strategy", label: "Strategy / transformation" },
  { value: "legal_compliance", label: "Legal / compliance / risk" },
  { value: "consulting", label: "Consulting / advisory" },
  { value: "design_product", label: "Product / design" },
  { value: "general_professional", label: "General / cross-functional" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const STUDY_AREAS: ContextOption[] = [
  { value: "", label: "Not specified" },
  { value: "business_finance", label: "Business / economics / finance" },
  { value: "stem_technical", label: "STEM / technical" },
  { value: "law_policy", label: "Law / politics / policy" },
  { value: "humanities_social", label: "Humanities / social sciences" },
  { value: "health_life_sciences", label: "Health / life sciences" },
  { value: "creative_design", label: "Creative / design" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const STUDY_STAGE_OPTIONS: ContextOption[] = [
  { value: "", label: "Not specified" },
  { value: "year_1", label: "First year" },
  { value: "year_2", label: "Second year" },
  { value: "year_3_plus", label: "Third year or later" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const RESPONSIBILITY_OPTIONS: ContextOption[] = [
  { value: "", label: "Not specified" },
  { value: "individual_contributor", label: "Individual contributor" },
  { value: "small_team", label: "Small team" },
  { value: "multiple_teams", label: "Multiple teams" },
  { value: "department_function", label: "Department / function" },
  { value: "business_unit", label: "Business unit" },
  { value: "enterprise", label: "Enterprise-wide" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const ORGANISATION_SCALE_OPTIONS: ContextOption[] = [
  { value: "", label: "Not specified" },
  { value: "under_100", label: "Under 100 people" },
  { value: "100_999", label: "100–999 people" },
  { value: "1000_9999", label: "1,000–9,999 people" },
  { value: "10000_plus", label: "10,000+ people" },
  { value: "other", label: "Other / varies" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const GOALS: Record<AudienceSegment, ContextOption[]> = {
  casual: [
    ["", "Not specified"], ["make_better_everyday_decisions", "Make better everyday decisions"], ["understand_news_online", "Understand news and online information"], ["use_ai_wisely", "Use AI more wisely"], ["spot_misleading_claims", "Spot misleading claims"], ["ask_better_questions", "Ask better questions"], ["think_more_clearly", "Think more clearly"], ["build_lifelong_learning_habit", "Build a learning habit"], ["other", "Other"], ["prefer_not", "Prefer not to say"],
  ].map(([value,label]) => ({ value, label })),
  university_student: [
    ["", "Not specified"], ["academic_performance", "Improve academic performance"], ["graduate_readiness", "Prepare for graduate employment"], ["make_better_decisions", "Make better everyday decisions"], ["work_effectively_with_ai", "Use AI effectively for study"], ["critical_thinking_general", "Improve critical thinking generally"], ["other", "Other"], ["prefer_not", "Prefer not to say"],
  ].map(([value,label]) => ({ value, label })),
  graduate_early_career: [
    ["", "Not specified"], ["communicate_with_confidence", "Communicate with confidence"], ["analyse_information", "Analyse information"], ["make_recommendations", "Make recommendations"], ["work_effectively_with_ai", "Work effectively with AI"], ["build_professional_judgement", "Build professional judgement"], ["progress_faster", "Progress faster at work"], ["other", "Other"], ["prefer_not", "Prefer not to say"],
  ].map(([value,label]) => ({ value, label })),
  junior_professional: [
    ["", "Not specified"], ["make_recommendations", "Make stronger recommendations"], ["manage_upwards", "Manage upwards"], ["communicate_with_confidence", "Communicate uncertainty clearly"], ["work_effectively_with_ai", "Use AI without weakening judgement"], ["build_professional_judgement", "Become trusted for judgement"], ["analyse_information", "Analyse evidence better"], ["other", "Other"], ["prefer_not", "Prefer not to say"],
  ].map(([value,label]) => ({ value, label })),
  management: [
    ["", "Not specified"], ["people_decisions", "People decisions"], ["prioritisation", "Prioritisation"], ["resource_allocation", "Resource allocation"], ["influencing_stakeholders", "Influencing stakeholders"], ["managing_risk", "Managing risk"], ["leading_change", "Leading change"], ["ai_enabled_management", "AI-enabled management"], ["other", "Other"], ["prefer_not", "Prefer not to say"],
  ].map(([value,label]) => ({ value, label })),
  executive: [
    ["", "Not specified"], ["strategy", "Strategy"], ["transformation", "Transformation"], ["capital_allocation", "Capital allocation"], ["organisational_performance", "Organisational performance"], ["ai_and_technology", "AI and technology"], ["governance_risk", "Governance / risk"], ["commercial_growth", "Commercial growth"], ["other", "Other"], ["prefer_not", "Prefer not to say"],
  ].map(([value,label]) => ({ value, label })),
};

export function functionOptionsForAudience(audience: AudienceSegment) {
  if (audience === "casual") return CASUAL_INTERESTS;
  return audience === "university_student" ? STUDY_AREAS : PROFESSIONAL_FUNCTIONS;
}
export function goalOptionsForAudience(audience: AudienceSegment) { return GOALS[audience]; }
export function contextFieldLabel(audience: AudienceSegment) {
  if (audience === "casual") return "Interest area";
  if (audience === "university_student") return "Study area";
  if (audience === "executive") return "Executive remit / function";
  return "Function / discipline";
}
export function contextProfileFromRow(row: Record<string, unknown> | null | undefined): ContextProfile {
  const str = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
  return {
    functionArea: str(row?.function_area), industry: str(row?.industry), primaryGoal: str(row?.primary_goal), studyStage: str(row?.study_stage), roleFocus: str(row?.role_focus), responsibilityScope: str(row?.responsibility_scope), organisationScale: str(row?.organisation_scale),
  };
}

export function contextMode(moment?: ContextMoment | null): ContextMode {
  if (!moment) return "mixed";
  const weekday = Number(moment.localWeekday);
  const hour = Number(moment.localHour);
  const minute = Number(moment.localMinute);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return "mixed";
  if (weekday === 0 || weekday === 6) return "personal";
  const minutes = hour * 60 + minute;
  if (minutes >= 9 * 60 && minutes < 17 * 60 + 30) return "work";
  if (minutes >= 7 * 60 && minutes < 9 * 60) return "mixed";
  return "personal";
}

export function situationLabelForMoment(moment?: ContextMoment | null) {
  if (!moment) return "Situation";
  if (moment.localWeekday === 0 || moment.localWeekday === 6) return "Weekend situation";
  const mode = contextMode(moment);
  if (mode === "work") return "At work";
  if (moment.localHour >= 17) return "Tonight’s situation";
  if (moment.localHour < 9) return "Start-of-day situation";
  return "Everyday situation";
}

function audienceValues(content: { audience_segments?: unknown }) {
  return Array.isArray(content.audience_segments) ? content.audience_segments.map(String) : [];
}

export function contentEligibleForMoment(content: { audience_segments?: unknown }, audience: AudienceSegment, moment?: ContextMoment | null) {
  const audiences = audienceValues(content);
  if (!audiences.length || audiences.includes("all") || audiences.includes(audience)) return true;
  // Life-native content can deliberately transfer into professional/student profiles outside work/study contexts.
  // The reverse is intentionally not allowed: casual learners should never receive executive/management-only scenarios.
  return Boolean(moment && audience !== "casual" && audiences.includes("casual"));
}

function matches(tags: unknown, value: string | null) {
  if (!value || value === "prefer_not" || !Array.isArray(tags) || !tags.length) return false;
  return tags.map(String).includes(value);
}

export function contentContextScore(
  content: { audience_segments?: unknown; function_tags?: unknown; industry_tags?: unknown; goal_tags?: unknown },
  audience: AudienceSegment,
  profile: ContextProfile,
  moment?: ContextMoment | null,
) {
  const audiences = audienceValues(content);
  const exact = audiences.includes(audience);
  const universal = audiences.includes("all") || !audiences.length;
  const casualTransfer = Boolean(moment && audience !== "casual" && audiences.includes("casual"));
  if (!exact && !universal && !casualTransfer) return -100;

  if (!moment) {
    let score = exact ? 20 : universal ? 2 : -100;
    if (matches(content.function_tags, profile.functionArea)) score += 8;
    if (matches(content.industry_tags, profile.industry)) score += 5;
    if (matches(content.goal_tags, profile.primaryGoal)) score += 7;
    return score;
  }

  const mode = contextMode(moment);
  let score: number;
  if (audience === "casual" && exact) score = 24;
  else if (exact) score = mode === "work" ? 20 : mode === "mixed" ? 14 : 8;
  else if (casualTransfer) score = mode === "personal" ? 24 : mode === "mixed" ? 12 : 2;
  else score = 10;

  const profileWeight = mode === "work" ? 1 : mode === "mixed" ? 0.6 : 0.25;
  if (matches(content.function_tags, profile.functionArea)) score += Math.round(8 * profileWeight);
  if (matches(content.industry_tags, profile.industry)) score += Math.round(5 * profileWeight);
  if (matches(content.goal_tags, profile.primaryGoal)) score += 7;
  return score;
}

export function contextSummary(audience: AudienceSegment, profile: ContextProfile) {
  const functionLabel = functionOptionsForAudience(audience).find((item) => item.value === profile.functionArea)?.label;
  const goalLabel = goalOptionsForAudience(audience).find((item) => item.value === profile.primaryGoal)?.label;
  return [functionLabel, goalLabel].filter(Boolean).join(" · ");
}
