import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";

export const AUDIENCES = [
  "casual",
  "university_student",
  "graduate_early_career",
  "junior_professional",
  "management",
  "executive",
] as const;
export type Audience = (typeof AUDIENCES)[number];
export type ContextMode = "work" | "mixed" | "personal";
export type ContextMoment = { localHour: number; localMinute: number; localWeekday: number };
export type ContextProfile = {
  functionArea: string | null;
  industry: string | null;
  primaryGoal: string | null;
  studyStage: string | null;
  roleFocus: string | null;
  responsibilityScope: string | null;
  organisationScale: string | null;
};

type Challenge = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  challenge_type: string;
  interaction_type: string;
  interaction_config: Record<string, unknown>;
  difficulty: number;
  confidence_required: boolean;
  audience_segments: string[];
  scenario_context: string | null;
  scenario_category: string | null;
  function_tags: string[];
  industry_tags: string[];
  goal_tags: string[];
  complexity_level: number | null;
  is_diagnostic?: boolean;
  diagnostic_role?: string | null;
  sort_order?: number;
};
export type DailyLesson = {
  id: string;
  content_key?: string | null;
  slug: string;
  title: string;
  subtitle: string;
  emoji: string;
  estimated_minutes: number;
  difficulty?: number;
  audience_segments?: string[];
  scenario_context?: string | null;
  scenario_category?: string | null;
  function_tags?: string[];
  industry_tags?: string[];
  goal_tags?: string[];
  complexity_level?: number | null;
  content: { story: string; twist: string; principle: string; try_it: string; reveal: string; ai_age: string };
};
type ScoreRow = { skill_id: string; score: number; reliability: number; attempts: number };
type Assignment = { challenge: Challenge; reason: "weakest_measured" | "ai_verification" | "adaptive_variety" | "fallback"; skillId: string | null };
export type DailyTrainingSession = {
  id: string | null;
  sessionDate: string;
  status: "in_progress" | "completed";
  challenges: Challenge[];
  answeredChallengeIds: string[];
};
export type PracticeSession = { id: string; challenges: Challenge[]; answeredChallengeIds: string[] };

const CHALLENGE_FIELDS = "id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context,scenario_category,function_tags,industry_tags,goal_tags,complexity_level,is_diagnostic,diagnostic_role,sort_order";
const LESSON_FIELDS = "id,content_key,slug,title,subtitle,emoji,estimated_minutes,difficulty,audience_segments,scenario_context,scenario_category,function_tags,industry_tags,goal_tags,complexity_level,content";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUESTION_COUNTS: Record<Audience, number> = { casual: 5, university_student: 5, graduate_early_career: 5, junior_professional: 5, management: 4, executive: 3 };
const COMPLEXITY: Record<Audience, number> = { casual: 50, university_student: 42, graduate_early_career: 48, junior_professional: 54, management: 61, executive: 68 };
const SESSION_LABELS: Record<Audience, string> = { casual: "Everyday practice", university_student: "Daily practice", graduate_early_career: "Workplace practice", junior_professional: "Applied judgement", management: "Management decisions", executive: "Executive decisions" };

export function isAudience(value: unknown): value is Audience {
  return typeof value === "string" && (AUDIENCES as readonly string[]).includes(value);
}
export function audienceSessionLabel(audience: Audience) { return SESSION_LABELS[audience]; }
export function audienceMatches(segments: unknown, audience: Audience) {
  if (!Array.isArray(segments) || !segments.length) return true;
  const values = segments.map(String);
  return values.includes("all") || values.includes(audience);
}
export function safeTimeZone(value: unknown) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : "Europe/London";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "Europe/London";
  }
}
function parts(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
}
function part(list: Intl.DateTimeFormatPart[], type: string) { return list.find((item) => item.type === type)?.value ?? ""; }
export function localDateKey(date: Date, timeZone: string) {
  const list = parts(date, timeZone);
  return `${part(list, "year")}-${part(list, "month")}-${part(list, "day")}`;
}
export function previousDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() - 1);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}
export function deriveMoment(date: Date, timeZone: string): ContextMoment {
  const list = parts(date, timeZone);
  const weekday = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[part(list, "weekday") as "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat"] ?? 0;
  return { localHour: Number(part(list, "hour")), localMinute: Number(part(list, "minute")), localWeekday: weekday };
}
export function contextMode(moment: ContextMoment): ContextMode {
  if (moment.localWeekday === 0 || moment.localWeekday === 6) return "personal";
  const minutes = moment.localHour * 60 + moment.localMinute;
  if (minutes >= 9 * 60 && minutes < 17 * 60 + 30) return "work";
  if (minutes >= 7 * 60 && minutes < 9 * 60) return "mixed";
  return "personal";
}
export function situationLabelForMoment(moment: ContextMoment) {
  if (moment.localWeekday === 0 || moment.localWeekday === 6) return "Weekend situation";
  const mode = contextMode(moment);
  if (mode === "work") return "At work";
  if (moment.localHour >= 17) return "Tonight’s situation";
  if (moment.localHour < 9) return "Start-of-day situation";
  return "Everyday situation";
}
function contextProfile(row: Record<string, unknown> | null | undefined): ContextProfile {
  const str = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
  return {
    functionArea: str(row?.function_area), industry: str(row?.industry), primaryGoal: str(row?.primary_goal),
    studyStage: str(row?.study_stage), roleFocus: str(row?.role_focus), responsibilityScope: str(row?.responsibility_scope), organisationScale: str(row?.organisation_scale),
  };
}
function audienceValues(content: { audience_segments?: unknown }) {
  return Array.isArray(content.audience_segments) ? content.audience_segments.map(String) : [];
}
export function contentEligibleForMoment(content: { audience_segments?: unknown }, audience: Audience, moment: ContextMoment) {
  const audiences = audienceValues(content);
  if (!audiences.length || audiences.includes("all") || audiences.includes(audience)) return true;
  return audience !== "casual" && audiences.includes("casual") && contextMode(moment) !== "work";
}
function matches(tags: unknown, value: string | null) {
  return Boolean(value && value !== "prefer_not" && Array.isArray(tags) && tags.map(String).includes(value));
}
export function contentContextScore(
  content: { audience_segments?: unknown; function_tags?: unknown; industry_tags?: unknown; goal_tags?: unknown },
  audience: Audience,
  profile: ContextProfile,
  moment: ContextMoment,
) {
  const audiences = audienceValues(content);
  const exact = audiences.includes(audience);
  const universal = audiences.includes("all") || !audiences.length;
  const mode = contextMode(moment);
  const casualTransfer = audience !== "casual" && audiences.includes("casual") && mode !== "work";
  if (!exact && !universal && !casualTransfer) return -100;

  let score: number;
  if (audience === "casual" && exact) score = 28;
  else if (exact) score = mode === "work" ? 24 : mode === "mixed" ? 14 : 7;
  else if (casualTransfer) score = mode === "personal" ? 30 : 16;
  else score = 11;

  const profileWeight = mode === "work" ? 1 : mode === "mixed" ? 0.55 : 0.2;
  if (matches(content.function_tags, profile.functionArea)) score += Math.round(8 * profileWeight);
  if (matches(content.industry_tags, profile.industry)) score += Math.round(5 * profileWeight);
  if (matches(content.goal_tags, profile.primaryGoal)) score += 8;
  return score;
}
function effectiveScore(row: ScoreRow) {
  const reliability = Math.max(0, Math.min(1, Number(row.reliability ?? 0)));
  return 50 + (Number(row.score) - 50) * reliability;
}
function targetDifficulty(audience: Audience, measured: number) { return Math.round(measured * 0.68 + COMPLEXITY[audience] * 0.32); }
function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) { value ^= text.charCodeAt(i); value = Math.imul(value, 16777619); }
  return value >>> 0;
}
function promptKey(value: string) { return value.trim().toLowerCase().replace(/\s+/g, " "); }
function scenarioKey(value: { scenario_category?: string | null; scenario_context?: string | null }) {
  return (value.scenario_category || value.scenario_context)?.trim().toLowerCase().replace(/\s+/g, " ") ?? null;
}
function familyPriority(challenge: Challenge) {
  return challenge.challenge_type === "audience_depth" ? 4 : challenge.challenge_type === "audience_scenario" ? 3 : challenge.challenge_type === "ai_answer_audit" ? 2 : challenge.challenge_type === "story_mcq" ? 1 : 0;
}
function feedbackScenarioKeys(rows: unknown[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const properties = (row as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object") continue;
    const raw = (properties as { scenario_category?: unknown }).scenario_category;
    if (typeof raw === "string" && raw.trim()) keys.add(raw.trim().toLowerCase().replace(/\s+/g, " "));
  }
  return keys;
}
function rankChallenges(rows: Challenge[], target: number, seed: string, seenPrompts: Set<string>, recentScenarios: Set<string>, dislikedScenarios: Set<string>, audience: Audience, profile: ContextProfile, moment: ContextMoment) {
  return [...rows].sort((a, b) => {
    const seenA = seenPrompts.has(promptKey(a.prompt)) ? 1 : 0;
    const seenB = seenPrompts.has(promptKey(b.prompt)) ? 1 : 0;
    if (seenA !== seenB) return seenA - seenB;
    const scenarioA = scenarioKey(a), scenarioB = scenarioKey(b);
    const dislikedA = scenarioA && dislikedScenarios.has(scenarioA) ? 1 : 0;
    const dislikedB = scenarioB && dislikedScenarios.has(scenarioB) ? 1 : 0;
    if (dislikedA !== dislikedB) return dislikedA - dislikedB;
    const recentA = scenarioA && recentScenarios.has(scenarioA) ? 1 : 0;
    const recentB = scenarioB && recentScenarios.has(scenarioB) ? 1 : 0;
    if (recentA !== recentB) return recentA - recentB;
    const contextA = contentContextScore(a, audience, profile, moment);
    const contextB = contentContextScore(b, audience, profile, moment);
    if (contextA !== contextB) return contextB - contextA;
    const familyA = familyPriority(a), familyB = familyPriority(b);
    if (familyA !== familyB) return familyB - familyA;
    return Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target) || hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
  });
}

export async function profilePayload(admin: SupabaseClient, userId: string, email?: string) {
  const [{ data: profile, error: profileError }, { data: skillScores, error: scoreError }, { data: recent, error: responseError }, countResult] = await Promise.all([
    admin.from("profiles").select("id,full_name,audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale,time_zone,xp,current_streak,last_session_date").eq("id", userId).single(),
    admin.from("user_skill_scores").select("skill_id,score,reliability,attempts,evidence_points,last_seen_at,skills(name,slug,description)").eq("user_id", userId).order("score"),
    admin.from("user_responses").select("is_correct,score_fraction,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    admin.from("user_responses").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  if (profileError) throw profileError;
  if (scoreError) throw scoreError;
  if (responseError) throw responseError;
  const responses = recent ?? [];
  const averageScore = responses.length ? responses.reduce((sum, row) => sum + Number(row.score_fraction ?? (row.is_correct ? 1 : 0)), 0) / responses.length : null;
  return { profile: { ...profile, email }, skillScores: skillScores ?? [], summary: { answers: countResult.count ?? 0, averageScore } };
}

type DiagnosticRow = { id: string; sort_order: number; diagnostic_role: string | null; audience_segments: string[] | null };
type DiagnosticResponse = { challenge_id: string; session_key: string | null; created_at: string };
export type DiagnosticProgress = { challengeIds: string[]; challengeCount: number; completedSessionKey: string | null; resumableSessionKey: string | null; answeredChallengeIds: string[] };
function buildDiagnosticIds(rows: DiagnosticRow[], audience: string | null) {
  const ordered = [...rows].sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const core = ordered.filter((row) => row.diagnostic_role === "core").slice(0, 7);
  const applied = isAudience(audience) ? ordered.filter((row) => row.diagnostic_role === "audience_applied" && row.audience_segments?.includes(audience)).slice(0, 5) : [];
  const picked = [...core, ...applied];
  const used = new Set(picked.map((row) => row.id));
  for (const row of ordered) { if (picked.length >= 12) break; if (!used.has(row.id) && row.diagnostic_role !== "audience_applied") { picked.push(row); used.add(row.id); } }
  return picked.slice(0, 12).map((row) => row.id);
}
function legacyDiagnosticIds(rows: DiagnosticRow[]) { return rows.filter((row) => row.diagnostic_role === "core" || row.diagnostic_role === "legacy").sort((a, b) => a.sort_order - b.sort_order).slice(0, 12).map((row) => row.id); }
export async function getDiagnosticProgress(admin: SupabaseClient, userId: string, knownChallengeIds?: string[]): Promise<DiagnosticProgress> {
  const [{ data: profile, error: profileError }, { data: definition, error: definitionError }] = await Promise.all([
    admin.from("profiles").select("audience_segment").eq("id", userId).single(),
    admin.from("challenges").select("id,sort_order,diagnostic_role,audience_segments").eq("is_published", true).eq("is_diagnostic", true).order("sort_order"),
  ]);
  if (profileError) throw profileError;
  if (definitionError) throw definitionError;
  const rows = (definition ?? []) as DiagnosticRow[];
  const allIds = rows.map((row) => row.id);
  let currentIds = knownChallengeIds?.length ? knownChallengeIds : buildDiagnosticIds(rows, profile?.audience_segment ?? null);
  if (!currentIds.length) return { challengeIds: [], challengeCount: 0, completedSessionKey: null, resumableSessionKey: null, answeredChallengeIds: [] };
  const { data, error } = allIds.length ? await admin.from("user_responses").select("challenge_id,session_key,created_at").eq("user_id", userId).in("challenge_id", allIds).order("created_at", { ascending: false }).limit(1200) : { data: [], error: null };
  if (error) throw error;
  const allSet = new Set(allIds), grouped = new Map<string, { answered: Set<string>; latestAt: string }>();
  for (const row of (data ?? []) as DiagnosticResponse[]) {
    const key = String(row.session_key ?? "");
    if (!UUID_RE.test(key) || !allSet.has(row.challenge_id)) continue;
    const existing = grouped.get(key) ?? { answered: new Set<string>(), latestAt: row.created_at };
    existing.answered.add(row.challenge_id);
    if (row.created_at > existing.latestAt) existing.latestAt = row.created_at;
    grouped.set(key, existing);
  }
  const sessions = [...grouped.entries()].map(([sessionKey, value]) => ({ sessionKey, answeredChallengeIds: [...value.answered], latestAt: value.latestAt })).sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  const completed = sessions.find((session) => session.answeredChallengeIds.length >= 12) ?? null;
  if (completed) return { challengeIds: currentIds, challengeCount: currentIds.length, completedSessionKey: completed.sessionKey, resumableSessionKey: null, answeredChallengeIds: completed.answeredChallengeIds };
  const partial = sessions.find((session) => session.answeredChallengeIds.length > 0) ?? null;
  if (partial && !knownChallengeIds) {
    const legacy = new Set(legacyDiagnosticIds(rows));
    if (partial.answeredChallengeIds.some((id) => legacy.has(id) && !currentIds.includes(id))) currentIds = legacyDiagnosticIds(rows);
  }
  const currentSet = new Set(currentIds);
  return { challengeIds: currentIds, challengeCount: currentIds.length, completedSessionKey: null, resumableSessionKey: partial?.sessionKey ?? null, answeredChallengeIds: partial?.answeredChallengeIds.filter((id) => currentSet.has(id)) ?? [] };
}

async function loadTrainingSession(admin: SupabaseClient, userId: string, session: { id: string; session_date: string; status: "in_progress" | "completed" }) {
  const [{ data: assignments, error: assignmentError }, { data: responses, error: responseError }] = await Promise.all([
    admin.from("training_session_challenges").select("challenge_id,position").eq("session_id", session.id).order("position"),
    admin.from("user_responses").select("challenge_id").eq("user_id", userId).eq("session_key", session.id),
  ]);
  if (assignmentError) throw assignmentError;
  if (responseError) throw responseError;
  const ids = (assignments ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  const { data, error } = ids.length ? await admin.from("challenges").select(CHALLENGE_FIELDS).in("id", ids).eq("is_published", true) : { data: [], error: null };
  if (error) throw error;
  const byId = new Map(((data ?? []) as Challenge[]).map((challenge) => [challenge.id, challenge]));
  return { id: session.id, sessionDate: session.session_date, status: session.status, challenges: ids.map((id) => byId.get(id)).filter(Boolean) as Challenge[], answeredChallengeIds: (responses ?? []).map((row: { challenge_id: string }) => row.challenge_id) } satisfies DailyTrainingSession;
}

async function buildPlan(admin: SupabaseClient, userId: string, audience: Audience, profile: ContextProfile, count: number, day: string, moment: ContextMoment): Promise<Assignment[]> {
  const [{ data: scores }, { data: history }, { data: mappings }, { data: challengeRows }, { data: answerRows }, { data: feedbackRows }] = await Promise.all([
    admin.from("user_skill_scores").select("skill_id,score,reliability,attempts").eq("user_id", userId),
    admin.from("user_responses").select("challenge_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10000),
    admin.from("challenge_skill_mapping").select("challenge_id,skill_id").limit(6000),
    admin.from("challenges").select(CHALLENGE_FIELDS).eq("is_published", true).eq("is_diagnostic", false).limit(3000),
    admin.from("challenge_answer_keys").select("challenge_id,correct_index").not("correct_index", "is", null).limit(5000),
    admin.from("analytics_events").select("properties,created_at").eq("user_id", userId).eq("event_name", "situation_not_relevant").order("created_at", { ascending: false }).limit(30),
  ]);
  const all = (challengeRows ?? []) as Challenge[];
  const challengeById = new Map(all.map((challenge) => [challenge.id, challenge]));
  const historyIds = new Set((history ?? []).map((row: { challenge_id: string }) => row.challenge_id));
  const promptById = new Map(all.map((challenge) => [challenge.id, promptKey(challenge.prompt)]));
  const seenPrompts = new Set<string>();
  for (const id of historyIds) { const key = promptById.get(id); if (key) seenPrompts.add(key); }
  const recentScenarios = new Set<string>();
  for (const row of (history ?? []).slice(0, 24) as { challenge_id: string }[]) { const challenge = challengeById.get(row.challenge_id); const key = challenge ? scenarioKey(challenge) : null; if (key) recentScenarios.add(key); }
  const dislikedScenarios = feedbackScenarioKeys(feedbackRows ?? []);
  const correct = new Map<string, number>();
  for (const row of answerRows ?? []) { const position = Number(row.correct_index); if (position >= 0 && position <= 3) correct.set(String(row.challenge_id), position); }

  const eligible = all.filter((challenge) => contentEligibleForMoment(challenge, audience, moment));
  const fresh = eligible.filter((challenge) => !historyIds.has(challenge.id) && !seenPrompts.has(promptKey(challenge.prompt)));
  const preferred = fresh.length >= count ? fresh : eligible;
  const measured = ((scores ?? []) as ScoreRow[]).filter((score) => score.attempts > 0).sort((a, b) => effectiveScore(a) - effectiveScore(b));
  const skillMap = new Map<string, string[]>();
  for (const mapping of mappings ?? []) skillMap.set(mapping.skill_id, [...(skillMap.get(mapping.skill_id) ?? []), mapping.challenge_id]);
  const usedIds = new Set<string>(), usedPrompts = new Set<string>(), usedScenarios = new Set<string>();
  const mcq = [0, 0, 0, 0], plan: Assignment[] = [];
  const target = targetDifficulty(audience, measured[0] ? effectiveScore(measured[0]) : 50);

  function choose(pool: Challenge[], reason: Assignment["reason"], skillId: string | null, seed: string) {
    const any = pool.filter((challenge) => !usedIds.has(challenge.id) && !usedPrompts.has(promptKey(challenge.prompt)));
    if (!any.length) return;
    const scenarioFresh = any.filter((challenge) => { const key = scenarioKey(challenge); return !key || !usedScenarios.has(key); });
    const available = scenarioFresh.length ? scenarioFresh : any;
    const formats = new Map<string, number>();
    for (const item of plan) formats.set(item.challenge.interaction_type, (formats.get(item.challenge.interaction_type) ?? 0) + 1);
    const minimum = Math.min(...available.map((challenge) => formats.get(challenge.interaction_type) ?? 0));
    const diverse = available.filter((challenge) => (formats.get(challenge.interaction_type) ?? 0) === minimum);
    const ranked = rankChallenges(diverse.length ? diverse : available, target, `${userId}:${day}:${seed}`, seenPrompts, recentScenarios, dislikedScenarios, audience, profile, moment);
    let picked = ranked[0];
    if (picked?.interaction_type === "single_choice") {
      const candidates = ranked.filter((challenge) => challenge.interaction_type === "single_choice").slice(0, 16);
      picked = [...candidates].sort((a, b) => {
        const answerA = correct.get(a.id), answerB = correct.get(b.id);
        const countA = answerA === undefined ? 99 : mcq[answerA], countB = answerB === undefined ? 99 : mcq[answerB];
        return countA - countB || candidates.indexOf(a) - candidates.indexOf(b);
      })[0] ?? picked;
    }
    if (!picked) return;
    usedIds.add(picked.id); usedPrompts.add(promptKey(picked.prompt));
    const key = scenarioKey(picked); if (key) usedScenarios.add(key);
    if (picked.interaction_type === "single_choice") { const position = correct.get(picked.id); if (position !== undefined) mcq[position] += 1; }
    plan.push({ challenge: picked, reason, skillId });
  }

  // Always rank the entire moment-eligible mapped pool. This is the key difference from the
  // legacy exact-audience-first branch: evening/weekend life-native transfer can now win.
  for (const skill of measured.slice(0, 2)) {
    const ids = new Set(skillMap.get(skill.skill_id) ?? []);
    const mappedFresh = fresh.filter((challenge) => ids.has(challenge.id));
    const mappedAny = preferred.filter((challenge) => ids.has(challenge.id));
    choose(mappedFresh.length ? mappedFresh : mappedAny, "weakest_measured", skill.skill_id, `skill:${skill.skill_id}`);
    if (plan.length >= count) break;
  }
  if (plan.length < count) choose(preferred.filter((challenge) => challenge.challenge_type === "ai_answer_audit"), "ai_verification", null, "ai");
  while (plan.length < count) {
    const before = plan.length;
    choose(preferred, "adaptive_variety", null, `fill:${plan.length}`);
    if (plan.length === before) break;
  }
  return plan.slice(0, count);
}

export async function getOrCreateDailyTrainingSession(admin: SupabaseClient, userId: string, timeZone: string, moment: ContextMoment): Promise<DailyTrainingSession> {
  const day = localDateKey(new Date(), timeZone), mode = contextMode(moment);
  const [{ data: profile, error: profileError }, { data: existing, error: existingError }] = await Promise.all([
    admin.from("profiles").select("audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale").eq("id", userId).single(),
    admin.from("training_sessions").select("id,session_date,status,context_mode").eq("user_id", userId).eq("session_date", day).maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (existingError) throw existingError;
  if (!isAudience(profile?.audience_segment)) return { id: null, sessionDate: day, status: "in_progress", challenges: [], answeredChallengeIds: [] };
  const audience = profile.audience_segment, count = QUESTION_COUNTS[audience], profileContext = contextProfile(profile);
  if (existing) {
    const loaded = await loadTrainingSession(admin, userId, existing as { id: string; session_date: string; status: "in_progress" | "completed" });
    if (existing.status === "in_progress" && loaded.answeredChallengeIds.length === 0 && existing.context_mode !== mode) {
      const plan = await buildPlan(admin, userId, audience, profileContext, count, day, moment);
      if (plan.length) {
        await admin.from("training_session_challenges").delete().eq("session_id", existing.id);
        const { error: assignmentError } = await admin.from("training_session_challenges").insert(plan.map((assignment, index) => ({ session_id: existing.id, position: index + 1, challenge_id: assignment.challenge.id, selection_reason: assignment.reason, target_skill_id: assignment.skillId })));
        if (assignmentError) throw assignmentError;
        const { error: updateError } = await admin.from("training_sessions").update({ context_mode: mode, lesson_id: null, updated_at: new Date().toISOString() }).eq("id", existing.id).eq("user_id", userId);
        if (updateError) throw updateError;
        return loadTrainingSession(admin, userId, existing as { id: string; session_date: string; status: "in_progress" | "completed" });
      }
    }
    return loaded;
  }
  const plan = await buildPlan(admin, userId, audience, profileContext, count, day, moment);
  if (!plan.length) return { id: null, sessionDate: day, status: "in_progress", challenges: [], answeredChallengeIds: [] };
  const { data: created, error: createError } = await admin.from("training_sessions").insert({ user_id: userId, session_date: day, status: "in_progress", context_mode: mode }).select("id,session_date,status").single();
  if (createError) {
    if (createError.code === "23505") {
      const { data: raced, error } = await admin.from("training_sessions").select("id,session_date,status").eq("user_id", userId).eq("session_date", day).single();
      if (error) throw error;
      return loadTrainingSession(admin, userId, raced as { id: string; session_date: string; status: "in_progress" | "completed" });
    }
    throw createError;
  }
  const { error: assignmentError } = await admin.from("training_session_challenges").insert(plan.map((assignment, index) => ({ session_id: created.id, position: index + 1, challenge_id: assignment.challenge.id, selection_reason: assignment.reason, target_skill_id: assignment.skillId })));
  if (assignmentError) { await admin.from("training_sessions").delete().eq("id", created.id); throw assignmentError; }
  return loadTrainingSession(admin, userId, created as { id: string; session_date: string; status: "in_progress" | "completed" });
}

function feedbackSets(rows: unknown[]) {
  const lessonIds = new Set<string>(), scenarios = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const properties = (row as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object") continue;
    const lessonId = (properties as { lesson_id?: unknown }).lesson_id, category = (properties as { scenario_category?: unknown }).scenario_category;
    if (typeof lessonId === "string" && lessonId.trim()) lessonIds.add(lessonId.trim());
    if (typeof category === "string" && category.trim()) scenarios.add(category.trim().toLowerCase().replace(/\s+/g, " "));
  }
  return { lessonIds, scenarios };
}
function rankLessons(lessons: DailyLesson[], target: number, seed: string, recentIds: Set<string>, recentScenarios: Set<string>, dislikedIds: Set<string>, dislikedScenarios: Set<string>, audience: Audience, profile: ContextProfile, moment: ContextMoment) {
  return [...lessons].sort((a, b) => {
    const scenarioA = scenarioKey(a), scenarioB = scenarioKey(b);
    const dislikedA = dislikedIds.has(a.id) || Boolean(scenarioA && dislikedScenarios.has(scenarioA)) ? 1 : 0;
    const dislikedB = dislikedIds.has(b.id) || Boolean(scenarioB && dislikedScenarios.has(scenarioB)) ? 1 : 0;
    if (dislikedA !== dislikedB) return dislikedA - dislikedB;
    const recentA = recentIds.has(a.id) ? 1 : 0, recentB = recentIds.has(b.id) ? 1 : 0;
    if (recentA !== recentB) return recentA - recentB;
    const repeatA = scenarioA && recentScenarios.has(scenarioA) ? 1 : 0, repeatB = scenarioB && recentScenarios.has(scenarioB) ? 1 : 0;
    if (repeatA !== repeatB) return repeatA - repeatB;
    const contextA = contentContextScore(a, audience, profile, moment), contextB = contentContextScore(b, audience, profile, moment);
    if (contextA !== contextB) return contextB - contextA;
    const curatedA = a.content_key?.startsWith("v014_") ? 1 : 0, curatedB = b.content_key?.startsWith("v014_") ? 1 : 0;
    if (curatedA !== curatedB) return curatedB - curatedA;
    return Math.abs(Number(a.difficulty ?? 50) - target) - Math.abs(Number(b.difficulty ?? 50) - target) || hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`);
  });
}
export async function getOrAssignDailyLesson(admin: SupabaseClient, userId: string, sessionId: string, moment: ContextMoment): Promise<DailyLesson | null> {
  const [{ data: session, error: sessionError }, { data: profile, error: profileError }] = await Promise.all([
    admin.from("training_sessions").select("id,lesson_id,context_mode").eq("id", sessionId).eq("user_id", userId).single(),
    admin.from("profiles").select("audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale").eq("id", userId).single(),
  ]);
  if (sessionError) throw sessionError;
  if (profileError) throw profileError;
  if (!isAudience(profile?.audience_segment)) return null;
  const audience = profile.audience_segment, profileContext = contextProfile(profile), mode = contextMode(moment);
  if (session.lesson_id && session.context_mode === mode) {
    const { data: existing } = await admin.from("daily_lessons").select(LESSON_FIELDS).eq("id", session.lesson_id).eq("is_published", true).maybeSingle();
    if (existing && contentEligibleForMoment(existing, audience, moment)) return existing as DailyLesson;
  }
  const [{ data: assignments }, { data: scoreRows }, { data: recent }, { data: feedbackRows }] = await Promise.all([
    admin.from("training_session_challenges").select("target_skill_id,position").eq("session_id", sessionId).order("position").limit(5),
    admin.from("user_skill_scores").select("skill_id,score,reliability,attempts").eq("user_id", userId).gt("attempts", 0).order("score").limit(6),
    admin.from("user_lesson_completions").select("lesson_id,completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(20),
    admin.from("analytics_events").select("properties,created_at").eq("user_id", userId).eq("event_name", "situation_not_relevant").order("created_at", { ascending: false }).limit(30),
  ]);
  const targetSkillId = (assignments ?? []).find((row: { target_skill_id: string | null }) => row.target_skill_id)?.target_skill_id ?? null;
  const targetRow = (scoreRows ?? []).find((row: { skill_id: string }) => row.skill_id === targetSkillId) ?? scoreRows?.[0];
  const measured = targetRow ? 50 + (Number(targetRow.score) - 50) * Number(targetRow.reliability ?? 0) : 50;
  const target = targetDifficulty(audience, measured), recentIds = new Set<string>((recent ?? []).map((row: { lesson_id: string }) => row.lesson_id));
  const recentScenarios = new Set<string>();
  if (recentIds.size) {
    const { data: recentLessons } = await admin.from("daily_lessons").select("id,scenario_context,scenario_category").in("id", [...recentIds]);
    for (const row of recentLessons ?? []) { const key = scenarioKey(row); if (key) recentScenarios.add(key); }
  }
  const disliked = feedbackSets(feedbackRows ?? []);
  let query = admin.from("daily_lessons").select(LESSON_FIELDS).eq("is_published", true);
  if (targetSkillId) query = query.eq("skill_id", targetSkillId);
  let { data: rows, error } = await query.order("sort_order").limit(300);
  if (error) throw error;
  let lessons = ((rows ?? []) as DailyLesson[]).filter((lesson) => contentEligibleForMoment(lesson, audience, moment));
  if (!lessons.length && targetSkillId) {
    const fallback = await admin.from("daily_lessons").select(LESSON_FIELDS).eq("is_published", true).order("sort_order").limit(400);
    if (fallback.error) throw fallback.error;
    rows = fallback.data; lessons = ((rows ?? []) as DailyLesson[]).filter((lesson) => contentEligibleForMoment(lesson, audience, moment));
  }
  if (!lessons.length) return null;
  const picked = rankLessons(lessons, target, `${userId}:${targetSkillId ?? "general"}:${audience}:${mode}`, recentIds, recentScenarios, disliked.lessonIds, disliked.scenarios, audience, profileContext, moment)[0];
  if (!picked) return null;
  const { error: updateError } = await admin.from("training_sessions").update({ lesson_id: picked.id, context_mode: mode, updated_at: new Date().toISOString() }).eq("id", sessionId).eq("user_id", userId);
  if (updateError) throw updateError;
  return picked;
}

async function loadPractice(admin: SupabaseClient, userId: string, sessionId: string): Promise<PracticeSession> {
  const [{ data: assignments, error: assignmentError }, { data: responses, error: responseError }] = await Promise.all([
    admin.from("practice_session_challenges").select("challenge_id,position").eq("session_id", sessionId).order("position"),
    admin.from("user_responses").select("challenge_id").eq("user_id", userId).eq("session_key", sessionId),
  ]);
  if (assignmentError) throw assignmentError;
  if (responseError) throw responseError;
  const ids = (assignments ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  const { data, error } = ids.length ? await admin.from("challenges").select(CHALLENGE_FIELDS).in("id", ids).eq("is_published", true) : { data: [], error: null };
  if (error) throw error;
  const byId = new Map(((data ?? []) as Challenge[]).map((challenge) => [challenge.id, challenge]));
  return { id: sessionId, challenges: ids.map((id) => byId.get(id)).filter(Boolean) as Challenge[], answeredChallengeIds: (responses ?? []).map((row: { challenge_id: string }) => row.challenge_id) };
}
export async function getOrCreatePracticeSession(admin: SupabaseClient, userId: string, skillSlug: string, moment: ContextMoment, count = 3): Promise<PracticeSession | null> {
  const [{ data: profile }, { data: skill }] = await Promise.all([
    admin.from("profiles").select("audience_segment,function_area,industry,primary_goal,study_stage,role_focus,responsibility_scope,organisation_scale").eq("id", userId).single(),
    admin.from("skills").select("id,slug,name").eq("slug", skillSlug).single(),
  ]);
  if (!skill || !isAudience(profile?.audience_segment)) return null;
  const audience = profile.audience_segment, profileContext = contextProfile(profile);
  const { data: existing } = await admin.from("practice_sessions").select("id").eq("user_id", userId).eq("skill_id", skill.id).eq("status", "in_progress").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.id) return loadPractice(admin, userId, existing.id);
  const [{ data: mappings }, { data: history }, { data: score }, { data: feedbackRows }] = await Promise.all([
    admin.from("challenge_skill_mapping").select("challenge_id").eq("skill_id", skill.id).limit(1000),
    admin.from("user_responses").select("challenge_id,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10000),
    admin.from("user_skill_scores").select("score,reliability").eq("user_id", userId).eq("skill_id", skill.id).maybeSingle(),
    admin.from("analytics_events").select("properties,created_at").eq("user_id", userId).eq("event_name", "situation_not_relevant").order("created_at", { ascending: false }).limit(30),
  ]);
  const mappedIds = (mappings ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  if (!mappedIds.length) return null;
  const { data: challengeRows, error } = await admin.from("challenges").select(CHALLENGE_FIELDS).in("id", mappedIds).eq("is_published", true).eq("is_diagnostic", false).limit(1000);
  if (error) throw error;
  const all = (challengeRows ?? []) as Challenge[], seenIds = new Set((history ?? []).map((row: { challenge_id: string }) => row.challenge_id));
  const promptById = new Map(all.map((challenge) => [challenge.id, promptKey(challenge.prompt)])), seenPrompts = new Set<string>();
  for (const id of seenIds) { const key = promptById.get(id); if (key) seenPrompts.add(key); }
  const recentScenarios = new Set<string>();
  for (const row of (history ?? []).slice(0, 24) as { challenge_id: string }[]) { const challenge = all.find((item) => item.id === row.challenge_id); const key = challenge ? scenarioKey(challenge) : null; if (key) recentScenarios.add(key); }
  const dislikedScenarios = feedbackScenarioKeys(feedbackRows ?? []);
  const eligible = all.filter((challenge) => contentEligibleForMoment(challenge, audience, moment));
  const fresh = eligible.filter((challenge) => !seenIds.has(challenge.id) && !seenPrompts.has(promptKey(challenge.prompt)));
  const pool = fresh.length >= count ? fresh : eligible;
  const measured = score ? 50 + (Number(score.score) - 50) * Number(score.reliability ?? 0) : 50, target = targetDifficulty(audience, measured);
  const candidates = rankChallenges(pool, target, `${userId}:${skillSlug}:${contextMode(moment)}`, seenPrompts, recentScenarios, dislikedScenarios, audience, profileContext, moment);
  const picked: Challenge[] = [], usedPrompts = new Set<string>(), usedScenarios = new Set<string>();
  for (const challenge of candidates) {
    const key = promptKey(challenge.prompt), scenario = scenarioKey(challenge);
    if (usedPrompts.has(key) || (scenario && usedScenarios.has(scenario) && candidates.length > count)) continue;
    usedPrompts.add(key); if (scenario) usedScenarios.add(scenario); picked.push(challenge); if (picked.length >= count) break;
  }
  if (!picked.length) return null;
  const { data: created, error: createError } = await admin.from("practice_sessions").insert({ user_id: userId, skill_id: skill.id, status: "in_progress" }).select("id").single();
  if (createError) {
    if (createError.code === "23505") {
      const { data: raced } = await admin.from("practice_sessions").select("id").eq("user_id", userId).eq("skill_id", skill.id).eq("status", "in_progress").order("created_at", { ascending: false }).limit(1).maybeSingle();
      return raced?.id ? loadPractice(admin, userId, raced.id) : null;
    }
    throw createError;
  }
  const { error: assignmentError } = await admin.from("practice_session_challenges").insert(picked.map((challenge, index) => ({ session_id: created.id, challenge_id: challenge.id, position: index + 1 })));
  if (assignmentError) { await admin.from("practice_sessions").delete().eq("id", created.id); throw assignmentError; }
  return loadPractice(admin, userId, created.id);
}
