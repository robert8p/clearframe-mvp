import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCE_SEGMENTS, audienceMeta } from "@/lib/audience";

type EventRow = { user_id: string | null; event_name: string; properties: unknown; created_at: string };
type ProfileRow = { id: string; audience_segment: string | null; created_at: string };
type SessionRow = { id: string; user_id: string; status: string; created_at: string; completed_at: string | null };
type FeedbackRow = { user_id: string; reaction: string; audience_segment: string | null; created_at: string };
type LessonCompletionRow = { user_id: string; completed_at: string };

function asProps(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function pct(numerator: number, denominator: number) { return denominator ? Math.round((numerator / denominator) * 100) : null; }
function pctLabel(value: number | null) { return value === null ? "Collecting" : `${value}%`; }
function uniqueUsers(rows: Array<{ user_id: string | null }>) { return new Set(rows.map((row) => row.user_id).filter((value): value is string => Boolean(value))).size; }
function dayKey(event: EventRow) {
  const value = asProps(event.properties).local_date;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : event.created_at.slice(0, 10);
}
function addDays(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function dayDistance(a: string, b: string) { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000); }
function eventKey(event: EventRow) {
  const properties = asProps(event.properties);
  const session = properties.session_id;
  const challenge = properties.challenge_id;
  if (!event.user_id || typeof session !== "string" || typeof challenge !== "string") return null;
  return `${event.user_id}:${session}:${challenge}`;
}

export default async function AnalyticsPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const now = Date.now();
  const d1 = new Date(now - 86400000).toISOString();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();
  const d60 = new Date(now - 60 * 86400000).toISOString();
  const today = new Date(now).toISOString().slice(0, 10);

  const [profilesResult, sessionsResult, eventsResult, feedbackResult, lessonResult] = await Promise.all([
    admin.from("profiles").select("id,audience_segment,created_at").order("created_at").limit(10000),
    admin.from("training_sessions").select("id,user_id,status,created_at,completed_at").order("created_at").limit(10000),
    admin.from("analytics_events").select("user_id,event_name,properties,created_at").gte("created_at", d60).order("created_at").limit(20000),
    admin.from("session_feedback").select("user_id,reaction,audience_segment,created_at").gte("created_at", d60).order("created_at").limit(10000),
    admin.from("user_lesson_completions").select("user_id,completed_at").order("completed_at").limit(10000),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const feedback = (feedbackResult.data ?? []) as FeedbackRow[];
  const lessonCompletions = (lessonResult.data ?? []) as LessonCompletionRow[];
  const events30 = events.filter((event) => event.created_at >= d30);
  const events7 = events.filter((event) => event.created_at >= d7);
  const events1 = events.filter((event) => event.created_at >= d1);
  const sessions30 = sessions.filter((session) => session.created_at >= d30);
  const feedback30 = feedback.filter((row) => row.created_at >= d30);

  const totalUsers = profiles.length;
  const audienceSelected = profiles.filter((profile) => Boolean(profile.audience_segment)).length;
  const lessonUsers = new Set(lessonCompletions.map((row) => row.user_id)).size;
  const completedSessionUsers = new Set(sessions.filter((session) => session.status === "completed").map((session) => session.user_id)).size;
  const active1 = uniqueUsers(events1);
  const active7 = uniqueUsers(events7);
  const active30 = uniqueUsers(events30);

  const sessionsCreated30 = sessions30.length;
  const sessionsCompleted30 = sessions30.filter((session) => session.status === "completed").length;
  const sessionCompletionRate = pct(sessionsCompleted30, sessionsCreated30);

  const lessonStarts30 = events30.filter((event) => event.event_name === "daily_lesson_started");
  const lessonCompletes30 = events30.filter((event) => event.event_name === "daily_lesson_completed");
  const lessonCompletionRate = pct(uniqueUsers(lessonCompletes30), uniqueUsers(lessonStarts30));

  const views = events30.filter((event) => event.event_name === "challenge_viewed");
  const answers = events30.filter((event) => event.event_name === "answer_submitted");
  const viewKeys = new Set(views.map(eventKey).filter((value): value is string => Boolean(value)));
  const answerKeys = new Set(answers.map(eventKey).filter((value): value is string => Boolean(value)));
  const abandoned = [...viewKeys].filter((key) => !answerKeys.has(key)).length;
  const challengeAbandonmentRate = pct(abandoned, viewKeys.size);
  const answerTimes = answers.map((event) => Number(asProps(event.properties).response_time_ms)).filter((value) => Number.isFinite(value) && value >= 0);
  const averageAnswerSeconds = answerTimes.length ? Math.round(answerTimes.reduce((sum, value) => sum + value, 0) / answerTimes.length / 1000) : null;

  const opens = events.filter((event) => event.event_name === "app_opened" && event.user_id);
  const opensByUser = new Map<string, Set<string>>();
  for (const event of opens) {
    if (!event.user_id) continue;
    const dates = opensByUser.get(event.user_id) ?? new Set<string>();
    dates.add(dayKey(event));
    opensByUser.set(event.user_id, dates);
  }
  function retention(days: number) {
    let eligible = 0;
    let retained = 0;
    for (const dates of opensByUser.values()) {
      const sorted = [...dates].sort();
      const first = sorted[0];
      if (!first || dayDistance(first, today) < days) continue;
      eligible += 1;
      if (dates.has(addDays(first, days))) retained += 1;
    }
    return { eligible, retained, rate: pct(retained, eligible) };
  }
  const d1Retention = retention(1);
  const d7Retention = retention(7);

  const reactionCounts = { not_for_me: 0, good: 0, great: 0 };
  for (const row of feedback30) if (row.reaction in reactionCounts) reactionCounts[row.reaction as keyof typeof reactionCounts] += 1;
  const positiveFeedback = reactionCounts.good + reactionCounts.great;
  const positiveFeedbackRate = pct(positiveFeedback, feedback30.length);

  const completed30Users = new Set(sessions30.filter((session) => session.status === "completed").map((session) => session.user_id));
  const active30Users = new Set(events30.map((event) => event.user_id).filter((value): value is string => Boolean(value)));
  const audienceSlugs = AUDIENCE_SEGMENTS.map((item) => item.slug);
  const audienceRows = audienceSlugs.map((slug) => {
    const users = profiles.filter((profile) => profile.audience_segment === slug).map((profile) => profile.id);
    return {
      slug,
      label: audienceMeta(slug)?.shortLabel ?? audienceMeta(slug)?.label ?? slug,
      users: users.length,
      active: users.filter((id) => active30Users.has(id)).length,
      completed: users.filter((id) => completed30Users.has(id)).length,
    };
  });

  const formatMap = new Map<string, { answers: number; scoreTotal: number; timeTotal: number; timed: number }>();
  for (const event of answers) {
    const properties = asProps(event.properties);
    const format = typeof properties.interaction_type === "string" ? properties.interaction_type : "unknown";
    const item = formatMap.get(format) ?? { answers: 0, scoreTotal: 0, timeTotal: 0, timed: 0 };
    item.answers += 1;
    const score = Number(properties.score_fraction);
    if (Number.isFinite(score)) item.scoreTotal += score;
    const time = Number(properties.response_time_ms);
    if (Number.isFinite(time) && time >= 0) { item.timeTotal += time; item.timed += 1; }
    formatMap.set(format, item);
  }
  const formatRows = [...formatMap.entries()].map(([format, item]) => ({
    format,
    answers: item.answers,
    score: item.answers ? Math.round((item.scoreTotal / item.answers) * 100) : 0,
    seconds: item.timed ? Math.round(item.timeTotal / item.timed / 1000) : null,
  })).sort((a, b) => b.answers - a.answers);

  const metricCards = [
    ["DAU", active1, "Active learners in the last 24 hours"],
    ["WAU", active7, "Active learners in the last 7 days"],
    ["MAU", active30, "Active learners in the last 30 days"],
    ["Session completion", pctLabel(sessionCompletionRate), `${sessionsCompleted30}/${sessionsCreated30} daily sessions completed`],
    ["Question abandonment", pctLabel(challengeAbandonmentRate), `${abandoned}/${viewKeys.size} viewed questions left unanswered`],
    ["Avg answer time", averageAnswerSeconds === null ? "Collecting" : `${averageAnswerSeconds}s`, `${answers.length} answered questions in 30 days`],
  ] as const;

  return (
    <div className="cg-analytics-page">
      <div className="cg-kicker">Cogni v0.9 · Engagement validation</div>
      <h1>Is the daily loop working?</h1>
      <p className="cg-analytics-intro">This dashboard measures the path that matters: personalise → learn → practise → understand the result → want to return. Retention begins collecting from the v0.9 instrumentation date.</p>

      <div className="cg-analytics-metrics">
        {metricCards.map(([label, value, detail]) => <section className="cg-card cg-analytics-metric" key={label}><div className="cg-kicker">{label}</div><div className="cg-stat">{value}</div><p>{detail}</p></section>)}
      </div>

      <div className="cg-grid two cg-analytics-two">
        <section className="cg-card">
          <div className="cg-section-head flush"><h2>Activation funnel</h2><span className="cg-pill">All time</span></div>
          <div className="cg-funnel-list">
            {[
              ["Accounts created", totalUsers, totalUsers],
              ["Learning context selected", audienceSelected, totalUsers],
              ["Completed a lesson", lessonUsers, totalUsers],
              ["Completed a daily session", completedSessionUsers, totalUsers],
            ].map(([label, value, denominator]) => {
              const rate = pct(Number(value), Number(denominator));
              return <div className="cg-funnel-row" key={String(label)}><div><strong>{label}</strong><span>{value} users</span></div><div className="cg-funnel-track"><i style={{ width: `${rate ?? 0}%` }} /></div><b>{pctLabel(rate)}</b></div>;
            })}
          </div>
        </section>

        <section className="cg-card">
          <div className="cg-section-head flush"><h2>Return behaviour</h2><span className="cg-pill">v0.9 cohort</span></div>
          <div className="cg-retention-grid">
            <div><span>Day 1 retention</span><strong>{pctLabel(d1Retention.rate)}</strong><small>{d1Retention.eligible ? `${d1Retention.retained}/${d1Retention.eligible} eligible users returned the next day` : "Needs at least one full day of app-open data"}</small></div>
            <div><span>Day 7 retention</span><strong>{pctLabel(d7Retention.rate)}</strong><small>{d7Retention.eligible ? `${d7Retention.retained}/${d7Retention.eligible} eligible users returned on day 7` : "Needs at least seven days of app-open data"}</small></div>
          </div>
          <div className="cg-analytics-note">Retention is deliberately shown as “Collecting” until a user has actually had enough elapsed time to qualify. Cogni does not manufacture an early percentage.</div>
        </section>
      </div>

      <div className="cg-grid two cg-analytics-two">
        <section className="cg-card">
          <div className="cg-section-head flush"><h2>Learning loop health</h2><span className="cg-pill">30 days</span></div>
          <div className="cg-health-list">
            <div><span>Lesson completion</span><strong>{pctLabel(lessonCompletionRate)}</strong><small>{uniqueUsers(lessonCompletes30)} completers from {uniqueUsers(lessonStarts30)} starters</small></div>
            <div><span>Daily-session completion</span><strong>{pctLabel(sessionCompletionRate)}</strong><small>{sessionsCompleted30} of {sessionsCreated30} sessions</small></div>
            <div><span>Question abandonment</span><strong>{pctLabel(challengeAbandonmentRate)}</strong><small>Viewed but not answered</small></div>
            <div><span>Positive session sentiment</span><strong>{pctLabel(positiveFeedbackRate)}</strong><small>{reactionCounts.great} 🤩 · {reactionCounts.good} 🙂 · {reactionCounts.not_for_me} 😕</small></div>
          </div>
        </section>

        <section className="cg-card">
          <div className="cg-section-head flush"><h2>Question formats</h2><span className="cg-pill">30 days</span></div>
          {formatRows.length ? <div className="cg-format-metrics">{formatRows.map((row) => <div key={row.format}><div><strong>{row.format.replaceAll("_", " ")}</strong><span>{row.answers} answers</span></div><b>{row.score}%</b><small>{row.seconds === null ? "—" : `${row.seconds}s avg`}</small></div>)}</div> : <p>Format-level behaviour will appear as learners answer v0.9 sessions.</p>}
        </section>
      </div>

      <section className="cg-card">
        <div className="cg-section-head flush"><h2>Audience engagement</h2><span className="cg-pill">Current profile context</span></div>
        <div className="cg-audience-analytics">{audienceRows.map((row) => <div key={row.slug}><strong>{row.label}</strong><span>{row.users} users</span><span>{row.active} active / 30d</span><span>{row.completed} completed sessions / 30d</span></div>)}</div>
      </section>

      <section className="cg-card cg-analytics-principle">
        <div className="cg-kicker">Decision rule</div>
        <h2>Optimise retention only after locating the leak.</h2>
        <p>If lesson completion is weak, fix lessons. If question abandonment is high, fix challenge design. If both are healthy but Day-1 return is weak, improve the end-of-session promise and tomorrow’s perceived value. The dashboard is built to distinguish those problems rather than collapse them into one engagement score.</p>
      </section>
    </div>
  );
}
