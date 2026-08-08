import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { localDateKey } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";

function skillInfo(value: any) { return Array.isArray(value) ? value[0] : value; }

function formatType(type: string) {
  return ({
    single_choice: "Choose one",
    multi_select: "Choose all that apply",
    ranking: "Put in order",
    classification: "Sort into groups",
    triage: "What would you do?",
  } as Record<string, string>)[type] ?? "Question";
}

type ReviewChallenge = { id: string; title: string; prompt: string; options: string[]; interaction_type: string; interaction_config: Record<string, unknown> | null };
type ReviewKey = { challenge_id: string; correct_index: number | null; correct_answer: unknown; explanation: string; thinking_principle: string };
type ResponseRow = { challenge_id: string; selected_index: number | null; response_payload: unknown; is_correct: boolean; score_fraction: number | string | null; confidence: number | null; response_time_ms: number | null; created_at: string };

function categoryLabel(challenge: ReviewChallenge, value: string) {
  const categories = Array.isArray(challenge.interaction_config?.categories) ? challenge.interaction_config?.categories as { id?: string; label?: string }[] : [];
  return categories.find((item) => item.id === value)?.label ?? value;
}

function formatAnswer(challenge: ReviewChallenge, value: unknown, fallbackIndex: number | null = null) {
  const type = challenge.interaction_type ?? "single_choice";
  const options = Array.isArray(challenge.options) ? challenge.options : [];
  if (type === "single_choice" || type === "triage") {
    const index = typeof value === "number" ? value : fallbackIndex;
    return typeof index === "number" && options[index] ? `${String.fromCharCode(65 + index)}. ${options[index]}` : "No answer recorded";
  }
  if (type === "multi_select") {
    const indices = Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : [];
    return indices.length ? indices.map((index) => options[index]).filter(Boolean).join(" • ") : "No answer recorded";
  }
  if (type === "ranking") {
    const indices = Array.isArray(value) ? value.map(Number).filter(Number.isInteger) : [];
    return indices.length ? indices.map((index, position) => `${position + 1}. ${options[index] ?? "Item"}`).join("\n") : "No order recorded";
  }
  if (type === "classification" && value && typeof value === "object" && !Array.isArray(value)) {
    const mapping = value as Record<string, string>;
    const lines = Object.entries(mapping).map(([index, category]) => `${options[Number(index)] ?? `Item ${Number(index) + 1}`} → ${categoryLabel(challenge, category)}`);
    return lines.length ? lines.join("\n") : "No groups recorded";
  }
  return "Answer recorded";
}

function formatCorrectAnswer(challenge: ReviewChallenge, key: ReviewKey | undefined) {
  if (!key) return "Best answer unavailable";
  const type = challenge.interaction_type ?? "single_choice";
  if (type === "single_choice" || type === "triage") return formatAnswer(challenge, key.correct_index, key.correct_index);
  return formatAnswer(challenge, key.correct_answer);
}

function formatTime(ms: number | null) {
  if (!ms || ms < 1000) return null;
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { user, supabase } = await requireUser();
  const params = await searchParams;
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [{ data: responses }, { data: scores }] = await Promise.all([
    supabase.from("user_responses").select("challenge_id,selected_index,response_payload,is_correct,score_fraction,confidence,response_time_ms,created_at").eq("user_id", user.id).gte("created_at", since).order("created_at"),
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name,slug)").eq("user_id", user.id).gt("attempts", 0).order("score", { ascending: false }).limit(4),
  ]);

  const rows = (responses ?? []) as ResponseRow[];
  const recentScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score_fraction ?? (row.is_correct ? 1 : 0)), 0) / rows.length * 100) : null;
  const confidenceValues = rows.map((row) => row.confidence).filter((value): value is number => typeof value === "number");
  const avgConfidence = confidenceValues.length ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length) : null;
  const dayCounts = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date(Date.now() - (6 - offset) * 86400000);
    const key = localDateKey(d);
    return { key, label: d.toLocaleDateString("en-GB", { weekday: "narrow", timeZone: "Europe/London" }), fullLabel: d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "Europe/London" }), count: rows.filter((row) => localDateKey(new Date(row.created_at)) === key).length };
  });
  const maxCount = Math.max(1, ...dayCounts.map((day) => day.count));
  const selectedDay = dayCounts.find((day) => day.key === params.day) ?? null;
  const selectedResponses = selectedDay ? rows.filter((row) => localDateKey(new Date(row.created_at)) === selectedDay.key) : [];
  const summaryTitle = recentScore === null ? "Your progress starts here." : recentScore >= 80 ? "Strong recent results." : recentScore >= 60 ? "Good progress." : "Useful results to learn from.";
  const summaryCopy = recentScore === null ? "Complete a lesson and some questions to start building your progress view." : `${rows.length} recent answer${rows.length === 1 ? "" : "s"}${avgConfidence === null ? "." : ` with average confidence of ${avgConfidence}%.`}`;

  const challengeById = new Map<string, ReviewChallenge>();
  const keyById = new Map<string, ReviewKey>();
  if (selectedResponses.length) {
    const ids = [...new Set(selectedResponses.map((row) => row.challenge_id))];
    const admin = createAdminClient();
    const [{ data: challengeRows }, { data: keyRows }] = await Promise.all([
      admin.from("challenges").select("id,title,prompt,options,interaction_type,interaction_config").in("id", ids),
      admin.from("challenge_answer_keys").select("challenge_id,correct_index,correct_answer,explanation,thinking_principle").in("challenge_id", ids),
    ]);
    for (const challenge of (challengeRows ?? []) as ReviewChallenge[]) challengeById.set(challenge.id, challenge);
    for (const key of (keyRows ?? []) as ReviewKey[]) keyById.set(key.challenge_id, key);
  }

  return (
    <div className="cg-mobile-page">
      <div className="cg-kicker">Progress</div>
      <h1 className="cg-screen-title">Your progress</h1>

      <section className={`cg-card cg-progress-summary ${recentScore === null ? "empty" : ""}`}>
        <div className="cg-ring big" style={{ ["--progress" as string]: `${(recentScore ?? 0) * 3.6}deg` }}><span>{recentScore === null ? "—" : `${recentScore}%`}</span></div>
        <div><h2>{summaryTitle}</h2><p>{summaryCopy}</p></div>
      </section>

      <section className="cg-card">
        <div className="cg-section-head flush"><h2>Weekly activity</h2><span className="cg-pill">{rows.length} answers</span></div>
        <div className="cg-week-bars" aria-label="Answers completed over the last seven days">
          {dayCounts.map((day) => (
            <Link className={`cg-week-col-link ${selectedDay?.key === day.key ? "active" : ""}`} key={day.key} href={`/progress?day=${day.key}#day-review`} aria-label={`${day.fullLabel}: ${day.count} answer${day.count === 1 ? "" : "s"}. Review this day.`} aria-current={selectedDay?.key === day.key ? "true" : undefined}>
              <div className="cg-week-track"><span style={{ height: `${day.count ? Math.max(8, day.count / maxCount * 100) : 0}%` }} /></div><small>{day.label}</small>
            </Link>
          ))}
        </div>
        <p className="cg-progress-hint">Tap any day to review the questions you answered.</p>
      </section>

      {selectedDay && (
        <section id="day-review" className="cg-day-review">
          <div className="cg-day-review-head">
            <div><div className="cg-kicker">Question review</div><h2>{selectedDay.fullLabel}</h2><p>{selectedResponses.length ? `${selectedResponses.length} answered question${selectedResponses.length === 1 ? "" : "s"}` : "No questions answered on this day."}</p></div>
            <Link href="/progress" className="cg-button secondary">Close review</Link>
          </div>
          {selectedResponses.length ? (
            <div className="cg-review-list">
              {selectedResponses.map((response, index) => {
                const challenge = challengeById.get(response.challenge_id);
                if (!challenge) return null;
                const key = keyById.get(response.challenge_id);
                const fraction = Number(response.score_fraction ?? (response.is_correct ? 1 : 0));
                const status = response.is_correct ? "Correct" : fraction >= 0.5 ? `${Math.round(fraction * 100)}% score` : "Worth reviewing";
                const statusClass = response.is_correct ? "good" : fraction >= 0.5 ? "partial" : "learning";
                const yourAnswer = formatAnswer(challenge, response.response_payload, response.selected_index);
                const bestAnswer = formatCorrectAnswer(challenge, key);
                const answerTime = formatTime(response.response_time_ms);
                return (
                  <article className="cg-card cg-review-card" key={`${response.challenge_id}-${response.created_at}-${index}`}>
                    <div className="cg-review-topline"><span className={`cg-review-status ${statusClass}`}>{status}</span><span className="cg-pill">{formatType(challenge.interaction_type)}</span></div>
                    <h3>{challenge.title}</h3><p>{challenge.prompt}</p>
                    <div className="cg-review-answer-grid"><div className="cg-review-answer yours"><small>Your answer</small><strong>{yourAnswer}</strong></div><div className="cg-review-answer best"><small>Best answer</small><strong>{bestAnswer}</strong></div></div>
                    <div className="cg-review-meta">{typeof response.confidence === "number" && <span className="cg-pill">Confidence {response.confidence}%</span>}{answerTime && <span className="cg-pill">Answered in {answerTime}</span>}</div>
                    {key?.explanation && <div className="cg-review-explanation"><strong>Why</strong><p>{key.explanation}</p></div>}
                    {key?.thinking_principle && <div className="cg-review-explanation"><strong>Key idea</strong><p>{key.thinking_principle}</p></div>}
                  </article>
                );
              })}
            </div>
          ) : <section className="cg-card"><p>There is nothing to review for this date yet. Select another day from the chart.</p></section>}
        </section>
      )}

      <section className="cg-section-head"><h2>Strongest skills so far</h2><Link href="/skills">See all</Link></section>
      <div className="cg-master-list">
        {(scores ?? []).length ? (scores ?? []).map((row: any, index: number) => {
          const skill = skillInfo(row.skills);
          return <Link href={skill?.slug ? `/skills/${skill.slug}` : "/skills"} className="cg-master-row" key={skill?.slug ?? index}><div className="cg-course-icon">{index + 1}</div><div className="cg-course-copy"><strong>{skill?.name ?? "Skill"}</strong><div className="progress"><span style={{ width: `${Math.round(row.score)}%` }} /></div><small>Evidence level {Math.round((row.reliability ?? 0) * 100)}%</small></div><span>{Math.round(row.score)}/100 ›</span></Link>;
        }) : <section className="cg-card"><p>No skill scores yet. Complete your starting check to create your first profile.</p><Link href="/diagnostic" className="cg-button cg-full">Open starting check</Link></section>}
      </div>
    </div>
  );
}
