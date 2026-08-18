import type { MobileAudience } from "@/lib/audience";

export type ContextOption = { value: string; label: string };
const option = (value: string, label: string): ContextOption => ({ value, label });

export const INDUSTRY_OPTIONS: ContextOption[] = [
  option("", "Not specified"), option("construction_real_estate", "Construction / real estate"), option("technology", "Technology"), option("financial_services", "Financial services"), option("professional_services", "Professional services"), option("consumer_retail", "Consumer / retail"), option("healthcare", "Healthcare"), option("public_sector", "Public sector"), option("education", "Education"), option("manufacturing_industrial", "Manufacturing / industrial"), option("media_creative", "Media / creative"), option("other", "Other"), option("prefer_not", "Prefer not to say"),
];

const CASUAL_INTERESTS: ContextOption[] = [
  option("", "Not specified"), option("everyday_decisions", "Everyday decisions"), option("news_media", "News, media & online information"), option("technology_ai", "Technology & AI"), option("money_purchases", "Money, purchases & reviews"), option("health_wellbeing", "Health & wellbeing information"), option("relationships_communication", "Relationships & communication"), option("travel_planning", "Travel & planning"), option("community_civic", "Community & civic issues"), option("personal_growth", "Personal growth & habits"), option("other", "Other"), option("prefer_not", "Prefer not to say"),
];

const PROFESSIONAL_FUNCTIONS: ContextOption[] = [
  option("", "Not specified"), option("finance_commercial", "Finance / commercial"), option("technology_engineering", "Technology / engineering"), option("marketing", "Marketing"), option("people_hr", "People / HR"), option("operations", "Operations / delivery"), option("sales_client", "Sales / client-facing"), option("strategy", "Strategy / transformation"), option("legal_compliance", "Legal / compliance / risk"), option("consulting", "Consulting / advisory"), option("design_product", "Product / design"), option("general_professional", "General / cross-functional"), option("other", "Other"), option("prefer_not", "Prefer not to say"),
];

const STUDY_AREAS: ContextOption[] = [
  option("", "Not specified"), option("business_finance", "Business / economics / finance"), option("stem_technical", "STEM / technical"), option("law_policy", "Law / politics / policy"), option("humanities_social", "Humanities / social sciences"), option("health_life_sciences", "Health / life sciences"), option("creative_design", "Creative / design"), option("other", "Other"), option("prefer_not", "Prefer not to say"),
];

export const STUDY_STAGE_OPTIONS = [option("", "Not specified"), option("year_1", "First year"), option("year_2", "Second year"), option("year_3_plus", "Third year or later"), option("postgraduate", "Postgraduate"), option("other", "Other"), option("prefer_not", "Prefer not to say")];
export const RESPONSIBILITY_OPTIONS = [option("", "Not specified"), option("individual_contributor", "Individual contributor"), option("small_team", "Small team"), option("multiple_teams", "Multiple teams"), option("department_function", "Department / function"), option("business_unit", "Business unit"), option("enterprise", "Enterprise-wide"), option("other", "Other"), option("prefer_not", "Prefer not to say")];
export const ORGANISATION_SCALE_OPTIONS = [option("", "Not specified"), option("under_100", "Under 100 people"), option("100_999", "100–999 people"), option("1000_9999", "1,000–9,999 people"), option("10000_plus", "10,000+ people"), option("other", "Other / varies"), option("prefer_not", "Prefer not to say")];

const GOALS: Record<MobileAudience, ContextOption[]> = {
  casual: [option("", "Not specified"), option("make_better_everyday_decisions", "Make better everyday decisions"), option("understand_news_online", "Understand news and online information"), option("use_ai_wisely", "Use AI more wisely"), option("spot_misleading_claims", "Spot misleading claims"), option("ask_better_questions", "Ask better questions"), option("think_more_clearly", "Think more clearly"), option("build_lifelong_learning_habit", "Build a learning habit"), option("other", "Other"), option("prefer_not", "Prefer not to say")],
  university_student: [option("", "Not specified"), option("academic_performance", "Improve academic performance"), option("graduate_readiness", "Prepare for graduate employment"), option("make_better_decisions", "Make better everyday decisions"), option("work_effectively_with_ai", "Use AI effectively for study"), option("critical_thinking_general", "Improve critical thinking generally"), option("other", "Other"), option("prefer_not", "Prefer not to say")],
  graduate_early_career: [option("", "Not specified"), option("communicate_with_confidence", "Communicate with confidence"), option("analyse_information", "Analyse information"), option("make_recommendations", "Make recommendations"), option("work_effectively_with_ai", "Work effectively with AI"), option("build_professional_judgement", "Build professional judgement"), option("progress_faster", "Progress faster at work"), option("other", "Other"), option("prefer_not", "Prefer not to say")],
  junior_professional: [option("", "Not specified"), option("make_recommendations", "Make stronger recommendations"), option("manage_upwards", "Manage upwards"), option("communicate_with_confidence", "Communicate uncertainty clearly"), option("work_effectively_with_ai", "Use AI without weakening judgement"), option("build_professional_judgement", "Become trusted for judgement"), option("analyse_information", "Analyse evidence better"), option("other", "Other"), option("prefer_not", "Prefer not to say")],
  management: [option("", "Not specified"), option("people_decisions", "People decisions"), option("prioritisation", "Prioritisation"), option("resource_allocation", "Resource allocation"), option("influencing_stakeholders", "Influencing stakeholders"), option("managing_risk", "Managing risk"), option("leading_change", "Leading change"), option("ai_enabled_management", "AI-enabled management"), option("other", "Other"), option("prefer_not", "Prefer not to say")],
  executive: [option("", "Not specified"), option("strategy", "Strategy"), option("transformation", "Transformation"), option("capital_allocation", "Capital allocation"), option("organisational_performance", "Organisational performance"), option("ai_and_technology", "AI and technology"), option("governance_risk", "Governance / risk"), option("commercial_growth", "Commercial growth"), option("other", "Other"), option("prefer_not", "Prefer not to say")],
};

export function functionOptionsForAudience(audience: MobileAudience) {
  return audience === "casual" ? CASUAL_INTERESTS : audience === "university_student" ? STUDY_AREAS : PROFESSIONAL_FUNCTIONS;
}
export function goalOptionsForAudience(audience: MobileAudience) { return GOALS[audience]; }
export function functionLabelForAudience(audience: MobileAudience) {
  if (audience === "casual") return "Interest area";
  if (audience === "university_student") return "Study area";
  if (audience === "executive") return "Executive remit / function";
  return "Function / discipline";
}
