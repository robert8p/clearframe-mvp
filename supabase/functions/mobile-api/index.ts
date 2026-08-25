import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2.110.8";
import {
  AUDIENCES,
  audienceSessionLabel,
  deriveMoment,
  getDiagnosticProgress,
  getOrAssignDailyLesson,
  getOrCreateDailyTrainingSession,
  getOrCreatePracticeSession,
  isAudience,
  localDateKey,
  previousDateKey,
  profilePayload,
  safeTimeZone,
  situationLabelForMoment,
  type Audience,
} from "./engine.ts";
import {
  BillingUnavailableError,
  PremiumRequiredError,
  loadEntitlementState,
  recordMonetizationAnalytics,
  requirePro,
  syncFromRevenueCat,
} from "./monetization.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "HttpError"; }
}
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: jsonHeaders }); }
function asObject(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function has(obj: Record<string, unknown>, key: string) { return Object.prototype.hasOwnProperty.call(obj, key); }
function optionalString(value: unknown, max: number, label: string) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new HttpError(400, `${label} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpError(400, `${label} is too long.`);
  return trimmed || null;
}
function requiredUuid(value: unknown, label: string) {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new HttpError(400, `${label} is invalid.`);
  return value;
}
function requiredInt(value: unknown, min: number, max: number, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new HttpError(400, `${label} is invalid.`);
  return parsed;
}
function parseEnvKey(name: "SUPABASE_PUBLISHABLE_KEYS" | "SUPABASE_SECRET_KEYS", fallback: string) {
  const raw = Deno.env.get(name);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch { /* use legacy fallback */ }
  }
  const value = Deno.env.get(fallback);
  if (!value) throw new Error(`Missing ${name}/${fallback}`);
  return value;
}
function clients(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("Missing SUPABASE_URL");
  const publishable = parseEnvKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secret = parseEnvKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) throw new HttpError(401, "Please sign in again.");
  const userClient = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return { userClient, admin, token };
}
async function requireUser(req: Request) {
  const { userClient, admin, token } = clients(req);
  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "Please sign in again.");
  return { user, admin };
}
async function enforceRateLimit(admin: SupabaseClient, userId: string, path: string, method: string) {
  const bucket = path.startsWith("/api/mobile/practice/") ? "practice" : path.replace("/api/mobile/", "").slice(0, 80);
  const limit = path === "/api/mobile/account" ? 5 : method === "GET" ? 180 : 90;
  const { data, error } = await admin.rpc("consume_mobile_api_rate_limit", { p_user_id: userId, p_bucket: bucket, p_limit: limit, p_window_seconds: 60 });
  if (error) throw error;
  if (data !== true) throw new HttpError(429, "Too many requests. Try again shortly.");
}
async function persistTimeZone(admin: SupabaseClient, userId: string, timeZone: string) {
  const { data, error } = await admin.from("profiles").select("time_zone").eq("id", userId).single();
  if (error) throw error;
  if (data?.time_zone !== timeZone) {
    const update = await admin.from("profiles").update({ time_zone: timeZone, updated_at: new Date().toISOString() }).eq("id", userId);
    if (update.error) throw update.error;
  }
}

const INDUSTRIES = new Set(["construction_real_estate","technology","financial_services","professional_services","consumer_retail","healthcare","public_sector","education","manufacturing_industrial","media_creative","other","prefer_not"]);
const CASUAL_FUNCTIONS = new Set(["everyday_decisions","news_media","technology_ai","money_purchases","health_wellbeing","relationships_communication","travel_planning","community_civic","personal_growth","other","prefer_not"]);
const STUDY_FUNCTIONS = new Set(["business_finance","stem_technical","law_policy","humanities_social","health_life_sciences","creative_design","other","prefer_not"]);
const PROFESSIONAL_FUNCTIONS = new Set(["finance_commercial","technology_engineering","marketing","people_hr","operations","sales_client","strategy","legal_compliance","consulting","design_product","general_professional","other","prefer_not"]);
const STUDY_STAGES = new Set(["year_1","year_2","year_3_plus","postgraduate","other","prefer_not"]);
const RESPONSIBILITIES = new Set(["individual_contributor","small_team","multiple_teams","department_function","business_unit","enterprise","other","prefer_not"]);
const SCALES = new Set(["under_100","100_999","1000_9999","10000_plus","other","prefer_not"]);
const GOALS: Record<Audience, Set<string>> = {
  casual: new Set(["make_better_everyday_decisions","understand_news_online","use_ai_wisely","spot_misleading_claims","ask_better_questions","think_more_clearly","build_lifelong_learning_habit","other","prefer_not"]),
  university_student: new Set(["academic_performance","graduate_readiness","make_better_decisions","work_effectively_with_ai","critical_thinking_general","other","prefer_not"]),
  graduate_early_career: new Set(["communicate_with_confidence","analyse_information","make_recommendations","work_effectively_with_ai","build_professional_judgement","progress_faster","other","prefer_not"]),
  junior_professional: new Set(["make_recommendations","manage_upwards","communicate_with_confidence","work_effectively_with_ai","build_professional_judgement","analyse_information","other","prefer_not"]),
  management: new Set(["people_decisions","prioritisation","resource_allocation","influencing_stakeholders","managing_risk","leading_change","ai_enabled_management","other","prefer_not"]),
  executive: new Set(["strategy","transformation","capital_allocation","organisational_performance","ai_and_technology","governance_risk","commercial_growth","other","prefer_not"]),
};
function canonical(value: unknown, allowed: Set<string>, label: string) {
  const text = optionalString(value, 100, label);
  if (!text) return null;
  if (!allowed.has(text)) throw new HttpError(400, `Choose a valid ${label.toLowerCase()}.`);
  return text;
}
function functionSet(audience: Audience) { return audience === "casual" ? CASUAL_FUNCTIONS : audience === "university_student" ? STUDY_FUNCTIONS : PROFESSIONAL_FUNCTIONS; }

async function updateProfile(admin: SupabaseClient, user: User, body: unknown, timeZone: string) {
  const input = asObject(body);
  const { data: current, error: currentError } = await admin.from("profiles").select("audience_segment").eq("id", user.id).single();
  if (currentError) throw currentError;
  const requestedAudience = has(input, "audienceSegment") ? input.audienceSegment : current?.audience_segment;
  if (requestedAudience !== null && requestedAudience !== undefined && !isAudience(requestedAudience)) throw new HttpError(400, "Choose a valid learning context.");
  const audience = isAudience(requestedAudience) ? requestedAudience : null;
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), context_updated_at: new Date().toISOString(), time_zone: timeZone };
  if (has(input, "fullName")) updates.full_name = optionalString(input.fullName, 100, "Name");
  if (has(input, "audienceSegment")) updates.audience_segment = audience;
  if (has(input, "functionArea")) updates.function_area = audience ? canonical(input.functionArea, functionSet(audience), audience === "casual" ? "Interest area" : audience === "university_student" ? "Study area" : "Function") : null;
  if (has(input, "industry")) updates.industry = audience === "casual" ? null : canonical(input.industry, INDUSTRIES, "Industry");
  if (has(input, "primaryGoal")) updates.primary_goal = audience ? canonical(input.primaryGoal, GOALS[audience], "Primary goal") : null;
  if (has(input, "studyStage")) updates.study_stage = audience === "university_student" ? canonical(input.studyStage, STUDY_STAGES, "Study stage") : null;
  if (has(input, "roleFocus")) updates.role_focus = optionalString(input.roleFocus, 120, "Role focus");
  if (has(input, "responsibilityScope")) updates.responsibility_scope = audience && !["casual","university_student"].includes(audience) ? canonical(input.responsibilityScope, RESPONSIBILITIES, "Responsibility scope") : null;
  if (has(input, "organisationScale")) updates.organisation_scale = audience && !["casual","university_student"].includes(audience) ? canonical(input.organisationScale, SCALES, "Organisation scale") : null;
  const { error } = await admin.from("profiles").update(updates).eq("id", user.id);
  if (error) throw error;
  await admin.from("analytics_events").insert({ user_id: user.id, event_name: "mobile_profile_updated", properties: { audience_segment: updates.audience_segment, function_area: updates.function_area, industry: updates.industry, primary_goal: updates.primary_goal } });
  return profilePayload(admin, user.id, user.email);
}

async function today(admin: SupabaseClient, user: User, timeZone: string) {
  await persistTimeZone(admin, user.id, timeZone);
  const moment = deriveMoment(new Date(), timeZone);
  const { data: profile, error: profileError } = await admin.from("profiles").select("audience_segment,full_name,function_area,industry,primary_goal,time_zone").eq("id", user.id).single();
  if (profileError) throw profileError;
  if (!isAudience(profile?.audience_segment)) return { state: "onboarding", profile };
  const diagnostic = await getDiagnosticProgress(admin, user.id);
  if (!diagnostic.completedSessionKey) {
    const { data, error } = diagnostic.challengeIds.length ? await admin.from("challenges").select("id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,confidence_required,audience_segments,scenario_context,scenario_category,function_tags,industry_tags,goal_tags,complexity_level").in("id", diagnostic.challengeIds).eq("is_published", true) : { data: [], error: null };
    if (error) throw error;
    const byId = new Map((data ?? []).map((challenge: { id: string }) => [challenge.id, challenge]));
    return { state: "diagnostic", sessionId: diagnostic.resumableSessionKey ?? crypto.randomUUID(), answeredChallengeIds: diagnostic.answeredChallengeIds, challenges: diagnostic.challengeIds.map((id) => byId.get(id)).filter(Boolean), modeLabel: "Starting check", profile };
  }
  const session = await getOrCreateDailyTrainingSession(admin, user.id, timeZone, moment);
  if (!session.id || !session.challenges.length) return { state: "unavailable", profile, message: "Cogni couldn't prepare today's training yet." };
  if (session.status === "completed" || session.answeredChallengeIds.length >= session.challenges.length) return { state: "complete", profile, session, modeLabel: audienceSessionLabel(profile.audience_segment) };
  const day = localDateKey(new Date(), timeZone);
  const { data: completion, error: completionError } = await admin.from("user_lesson_completions").select("id").eq("user_id", user.id).eq("lesson_date", day).maybeSingle();
  if (completionError) throw completionError;
  if (!completion) {
    const lesson = await getOrAssignDailyLesson(admin, user.id, session.id, moment);
    if (lesson) return { state: "lesson", profile, session, lesson, modeLabel: audienceSessionLabel(profile.audience_segment), situationLabel: situationLabelForMoment(moment) };
  }
  return { state: "training", profile, session, modeLabel: audienceSessionLabel(profile.audience_segment) };
}

function numberArray(value: unknown) { return Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : []; }
function arraysEqual(a: number[], b: number[]) { return a.length === b.length && a.every((value, index) => value === b[index]); }
function evaluateAnswer(type: string, options: string[], config: Record<string, unknown>, selectedIndex: number | undefined, payload: unknown, correctIndex: number | null, correctAnswer: unknown) {
  if (type === "single_choice" || type === "triage") {
    const chosen = selectedIndex ?? (typeof payload === "number" ? payload : undefined);
    if (chosen === undefined || correctIndex === null || chosen < 0 || chosen >= options.length) throw new HttpError(400, "Choose a valid answer before submitting.");
    return { correct: chosen === correctIndex, scoreFraction: chosen === correctIndex ? 1 : 0, storedPayload: chosen };
  }
  if (type === "multi_select") {
    if (!Array.isArray(payload)) throw new HttpError(400, "Select every answer that applies.");
    const chosen = [...new Set(numberArray(payload))].sort((a, b) => a - b);
    if (chosen.some((value) => value < 0 || value >= options.length)) throw new HttpError(400, "Choose only valid answers.");
    const requiredSelections = Number(config.requiredSelections ?? config.required_selections ?? 0);
    if (Number.isInteger(requiredSelections) && requiredSelections > 0 && chosen.length !== requiredSelections) throw new HttpError(400, `Choose exactly ${requiredSelections} answers.`);
    if (!chosen.length) throw new HttpError(400, "Select at least one answer.");
    const expected = numberArray(correctAnswer).sort((a, b) => a - b), selected = new Set(chosen), correctSet = new Set(expected);
    let right = 0;
    for (let index = 0; index < options.length; index += 1) if (selected.has(index) === correctSet.has(index)) right += 1;
    return { correct: arraysEqual(chosen, expected), scoreFraction: options.length ? right / options.length : 0, storedPayload: chosen };
  }
  if (type === "ranking") {
    if (!Array.isArray(payload)) throw new HttpError(400, "Rank every item before submitting.");
    const chosen = numberArray(payload), expected = numberArray(correctAnswer);
    if (chosen.length !== options.length || new Set(chosen).size !== options.length || chosen.some((value) => value < 0 || value >= options.length)) throw new HttpError(400, "Rank every item exactly once before submitting.");
    const right = chosen.reduce((sum, value, index) => sum + (value === expected[index] ? 1 : 0), 0);
    return { correct: arraysEqual(chosen, expected), scoreFraction: options.length ? right / options.length : 0, storedPayload: chosen };
  }
  if (type === "classification") {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new HttpError(400, "Classify every statement before submitting.");
    const chosen = payload as Record<string, string>, expected = asObject(correctAnswer) as Record<string, string>, keys = Object.keys(expected);
    if (!keys.length || keys.some((key) => typeof chosen[key] !== "string" || !chosen[key])) throw new HttpError(400, "Classify every statement before submitting.");
    const right = keys.reduce((sum, key) => sum + (chosen[key] === expected[key] ? 1 : 0), 0);
    return { correct: right === keys.length, scoreFraction: right / keys.length, storedPayload: chosen };
  }
  throw new HttpError(400, "Unsupported question format.");
}

async function submitAnswer(admin: SupabaseClient, user: User, body: unknown, timeZone: string) {
  const input = asObject(body);
  const challengeId = requiredUuid(input.challengeId, "Challenge"), sessionId = requiredUuid(input.sessionId, "Session");
  const mode = input.mode;
  if (mode !== "diagnostic" && mode !== "training" && mode !== "practice") throw new HttpError(400, "Answer mode is invalid.");
  if (mode === "practice") await requirePro(admin, user.id, "focused_practice");
  const responseTimeMs = requiredInt(input.responseTimeMs, 0, 3600000, "Response time");
  const confidence = input.confidence === undefined || input.confidence === null ? null : requiredInt(input.confidence, 0, 100, "Confidence");
  const selectedIndex = input.selectedIndex === undefined || input.selectedIndex === null ? undefined : requiredInt(input.selectedIndex, 0, 20, "Answer");
  if (mode === "diagnostic") {
    const diagnostic = await getDiagnosticProgress(admin, user.id);
    if (diagnostic.completedSessionKey) throw new HttpError(409, "Your starting check is already complete.");
    if (!diagnostic.challengeIds.includes(challengeId)) throw new HttpError(403, "This challenge is not assigned to your starting check.");
    if (diagnostic.resumableSessionKey && diagnostic.resumableSessionKey !== sessionId) throw new HttpError(409, "Continue the starting check you already began.");
    if (diagnostic.answeredChallengeIds.includes(challengeId)) throw new HttpError(409, "This starting-check challenge has already been submitted.");
  }
  const [{ data: challenge, error: challengeError }, { data: key, error: keyError }] = await Promise.all([
    admin.from("challenges").select("id,difficulty,is_diagnostic,interaction_type,interaction_config,options").eq("id", challengeId).eq("is_published", true).single(),
    admin.from("challenge_answer_keys").select("correct_index,correct_answer,explanation,thinking_principle,application,error_patterns").eq("challenge_id", challengeId).single(),
  ]);
  if (challengeError || !challenge) throw new HttpError(404, "Challenge not found.");
  if (keyError || !key) throw new HttpError(500, "This challenge cannot be graded right now.");
  const type = challenge.interaction_type ?? "single_choice", options = Array.isArray(challenge.options) ? challenge.options.map(String) : [];
  const evaluation = evaluateAnswer(type, options, asObject(challenge.interaction_config), selectedIndex, input.responsePayload, key.correct_index ?? null, key.correct_answer ?? key.correct_index);
  const scoreFraction = Number(evaluation.scoreFraction.toFixed(4)), xp = Math.max(7, Math.min(12, Math.round(7 + scoreFraction * 5)));
  const patterns = asObject(key.error_patterns);
  const pattern = evaluation.correct ? null : (type === "single_choice" || type === "triage") ? (typeof patterns[String(selectedIndex)] === "string" ? String(patterns[String(selectedIndex)]) : typeof patterns.default === "string" ? String(patterns.default) : "premature_closure") : typeof patterns.default === "string" ? String(patterns.default) : "premature_closure";
  const todayKey = localDateKey(new Date(), timeZone);
  const { data: scored, error: scoreError } = await admin.rpc("record_scored_answer", {
    p_user_id: user.id,
    p_challenge_id: challengeId,
    p_session_id: sessionId,
    p_mode: mode,
    p_selected_index: typeof evaluation.storedPayload === "number" ? evaluation.storedPayload : null,
    p_response_payload: evaluation.storedPayload,
    p_score_fraction: scoreFraction,
    p_is_correct: evaluation.correct,
    p_confidence: confidence,
    p_response_time_ms: responseTimeMs,
    p_error_pattern: pattern,
    p_xp: xp,
    p_today: todayKey,
    p_yesterday: previousDateKey(todayKey),
  });
  if (scoreError) {
    if (scoreError.code === "23505") throw new HttpError(409, "This challenge has already been submitted in this session.");
    if (/not found|not assigned|complete|diagnostic/i.test(scoreError.message ?? "")) throw new HttpError(409, scoreError.message);
    throw scoreError;
  }
  const scoredResult = asObject(scored);
  return {
    correct: evaluation.correct,
    correctIndex: key.correct_index,
    correctAnswer: key.correct_answer ?? key.correct_index,
    scoreFraction,
    explanation: key.explanation,
    thinkingPrinciple: key.thinking_principle,
    application: key.application,
    errorPattern: pattern,
    skillUpdates: Array.isArray(scoredResult.skillUpdates) ? scoredResult.skillUpdates : [],
    xpEarned: xp,
    sessionCompleted: Boolean(scoredResult.sessionCompleted),
  };
}

async function completeLesson(admin: SupabaseClient, user: User, body: unknown, timeZone: string) {
  const input = asObject(body), lessonId = requiredUuid(input.lessonId, "Lesson");
  const { data: lesson } = await admin.from("daily_lessons").select("id,slug").eq("id", lessonId).eq("is_published", true).maybeSingle();
  if (!lesson) throw new HttpError(404, "Lesson not found.");
  const day = localDateKey(new Date(), timeZone);
  const { data: awarded, error } = await admin.rpc("complete_daily_lesson_with_xp", { p_user_id: user.id, p_lesson_id: lesson.id, p_lesson_date: day, p_completed_at: new Date().toISOString(), p_xp_award: 5 });
  if (error) throw error;
  const xpEarned = Number(awarded ?? 0);
  if (xpEarned > 0) await admin.from("analytics_events").insert({ user_id: user.id, event_name: "mobile_daily_lesson_completed", properties: { lesson_id: lesson.id, lesson_slug: lesson.slug, lesson_date: day, xp_awarded: xpEarned } });
  return { ok: true, xpEarned };
}
async function contextFeedback(admin: SupabaseClient, user: User, body: unknown) {
  const lessonId = requiredUuid(asObject(body).lessonId, "Lesson");
  const { data: lesson, error } = await admin.from("daily_lessons").select("id,scenario_category").eq("id", lessonId).eq("is_published", true).single();
  if (error) throw error;
  const write = await admin.from("analytics_events").insert({ user_id: user.id, event_name: "situation_not_relevant", properties: { lesson_id: lesson.id, scenario_category: lesson.scenario_category ?? null, source: "mobile_lesson" } });
  if (write.error) throw write.error;
  return { ok: true };
}
async function deleteAccount(admin: SupabaseClient, user: User) {
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  try {
    const { user, admin } = await requireUser(req);
    const envelope = asObject(await req.json());
    const rawPath = optionalString(envelope.path, 300, "Path");
    if (!rawPath) throw new HttpError(400, "Path is required.");
    const path = rawPath.split("?")[0];
    const method = typeof envelope.method === "string" ? envelope.method.toUpperCase() : "GET";
    const timeZone = safeTimeZone(asObject(envelope.context).timeZone);
    await enforceRateLimit(admin, user.id, path, method);

    let result: unknown;
    if (path === "/api/mobile/profile" && method === "GET") {
      await persistTimeZone(admin, user.id, timeZone);
      result = await profilePayload(admin, user.id, user.email);
    } else if (path === "/api/mobile/profile" && method === "POST") {
      result = await updateProfile(admin, user, envelope.body, timeZone);
    } else if (path === "/api/mobile/today" && method === "GET") {
      result = await today(admin, user, timeZone);
    } else if (path === "/api/mobile/answer" && method === "POST") {
      result = await submitAnswer(admin, user, envelope.body, timeZone);
    } else if (path === "/api/mobile/lesson/complete" && method === "POST") {
      result = await completeLesson(admin, user, envelope.body, timeZone);
    } else if (path === "/api/mobile/context-feedback" && method === "POST") {
      result = await contextFeedback(admin, user, envelope.body);
    } else if (path === "/api/mobile/entitlements" && method === "GET") {
      result = await loadEntitlementState(admin, user.id);
    } else if (path === "/api/mobile/entitlements/sync" && method === "POST") {
      result = await syncFromRevenueCat(admin, user.id);
    } else if (path === "/api/mobile/analytics" && method === "POST") {
      result = await recordMonetizationAnalytics(admin, user.id, envelope.body);
    } else if (path.startsWith("/api/mobile/practice/") && method === "GET") {
      await requirePro(admin, user.id, "focused_practice");
      await persistTimeZone(admin, user.id, timeZone);
      const slug = decodeURIComponent(path.slice("/api/mobile/practice/".length));
      if (!slug || slug.length > 100) throw new HttpError(400, "Skill not found.");
      const diagnostic = await getDiagnosticProgress(admin, user.id);
      if (!diagnostic.completedSessionKey) throw new HttpError(409, "Complete your starting check first.");
      const moment = deriveMoment(new Date(), timeZone);
      const skillQuery = await admin.from("skills").select("name,slug").eq("slug", slug).maybeSingle();
      if (!skillQuery.data) throw new HttpError(404, "Skill not found.");
      const session = await getOrCreatePracticeSession(admin, user.id, slug, moment, 3);
      if (!session?.id || !session.challenges.length) throw new HttpError(404, "No suitable practice questions are available yet.");
      result = { skill: skillQuery.data, session, modeLabel: `${skillQuery.data.name} practice` };
    } else if (path === "/api/mobile/account" && method === "DELETE") {
      result = await deleteAccount(admin, user);
    } else {
      throw new HttpError(404, "Endpoint not found.");
    }
    return response(result);
  } catch (error) {
    if (error instanceof PremiumRequiredError) return response({ error: { code: error.code, message: error.message, details: { feature: error.feature } } }, error.status);
    if (error instanceof BillingUnavailableError) return response({ error: { code: error.code, message: error.message } }, error.status);
    if (error instanceof HttpError) return response({ error: error.message }, error.status);
    if (error instanceof Error && error.message === "invalid_monetization_event") return response({ error: { code: "invalid_request", message: "Invalid analytics event." } }, 400);
    const message = error instanceof Error ? error.message : String(error);
    console.error("mobile-api", message, error);
    return response({ error: "Cogni couldn't complete that request. Please try again." }, 500);
  }
});
