import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { audienceMatches, audienceMeta, isAudienceSegment } from "@/lib/audience";
import { SKILL_GUIDANCE } from "@/lib/skill-copy";
import { patternCopy } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function SkillDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ practised?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const { user, supabase } = await requireUser();
  const [{ data: profile }, { data: skill }] = await Promise.all([
    supabase.from("profiles").select("audience_segment").eq("id", user.id).single(),
    supabase.from("skills").select("id,slug,name,description").eq("slug", slug).maybeSingle(),
  ]);
  if (!skill) notFound();
  if (!isAudienceSegment(profile?.audience_segment)) redirect("/onboarding/audience");
  const audience = profile.audience_segment;
  const audienceLabel = audienceMeta(audience)?.label ?? "your context";

  const [{ data: score }, { data: mappings }, { data: updateRows }] = await Promise.all([
    supabase.from("user_skill_scores").select("score,reliability,attempts,last_seen_at").eq("user_id", user.id).eq("skill_id", skill.id).maybeSingle(),
    supabase.from("challenge_skill_mapping").select("challenge_id").eq("skill_id", skill.id).limit(500),
    supabase.from("user_response_skill_updates").select("score_before,score_after,created_at").eq("user_id", user.id).eq("skill_id", skill.id).order("created_at", { ascending: false }).limit(8),
  ]);
  const challengeIds = (mappings ?? []).map((row: { challenge_id: string }) => row.challenge_id);
  const { data: recentResponses } = challengeIds.length ? await supabase.from("user_responses").select("is_correct,score_fraction,error_pattern,created_at").eq("user_id", user.id).in("challenge_id", challengeIds).order("created_at", { ascending: false }).limit(8) : { data: [] };
  const { data: lessonRows } = await supabase.from("daily_lessons").select("id,title,subtitle,audience_segments,difficulty").eq("skill_id", skill.id).eq("is_published", true).order("sort_order").limit(100);
  const lessons = (lessonRows ?? []).filter((lesson: { audience_segments?: string[] }) => audienceMatches(lesson.audience_segments, audience));
  const specificLessons = lessons.filter((lesson: { audience_segments?: string[] }) => lesson.audience_segments?.includes(audience));
  const recommendedLesson = specificLessons[0] ?? lessons[0] ?? null;

  const guidance = SKILL_GUIDANCE[slug] ?? { why: skill.description, mistakes: ["Stopping before an important uncertainty is resolved"], ai: "Use this skill to check AI output rather than simply accepting or rejecting it." };
  const attempts = Number(score?.attempts ?? 0);
  const reliability = Number(score?.reliability ?? 0);
  const measured = attempts > 0;
  const recent = recentResponses ?? [];
  const recentScore = recent.length ? Math.round(recent.reduce((sum: number, row: any) => sum + Number(row.score_fraction ?? (row.is_correct ? 1 : 0)), 0) / recent.length * 100) : null;
  const oldestUpdate = updateRows?.[updateRows.length - 1];
  const newestUpdate = updateRows?.[0];
  const trend = oldestUpdate && newestUpdate ? Number((Number(newestUpdate.score_after) - Number(oldestUpdate.score_before)).toFixed(1)) : null;
  const patterns = new Map<string, number>();
  for (const row of recent) if (row.error_pattern) patterns.set(String(row.error_pattern), (patterns.get(String(row.error_pattern)) ?? 0) + 1);
  const topPatterns = [...patterns.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);

  return (
    <div className="cg-mobile-page">
      <Link href="/skills" className="cg-back-link">← All skills</Link>
      {query.practised === "1" && <div className="cg-success-banner">✦ Practice saved. Your skill score now includes these answers.</div>}
      <div className="cg-kicker">Skill detail</div>
      <h1 className="cg-screen-title">{skill.name}</h1>
      <p className="cg-page-intro">{skill.description}</p>

      <section className="cg-card cg-skill-hero">
        <div className="cg-ring big" style={{ ["--progress" as string]: `${(measured ? Number(score?.score ?? 50) : 0) * 3.6}deg` }}><span>{measured ? Math.round(Number(score?.score)) : "?"}</span></div>
        <div><div className="cg-kicker">Skill score</div><h2>{measured ? `${Math.round(Number(score?.score))}/100` : "Not measured yet"}</h2><p>{measured ? `${attempts} answers • evidence level ${Math.round(reliability * 100)}%` : "Answer a few questions on this skill before Cogni shows a score."}</p></div>
      </section>

      <div className="cg-skill-detail-stats">
        <div><small>Recent score</small><strong>{recentScore === null ? "—" : `${recentScore}%`}</strong></div>
        <div><small>Change over time</small><strong>{trend === null ? "Early" : `${trend > 0 ? "+" : ""}${trend}`}</strong></div>
        <div><small>Learning context</small><strong>{audienceLabel}</strong></div>
      </div>

      <section className="cg-card"><div className="cg-kicker">Why it matters</div><h2>Why this skill matters with AI</h2><p>{guidance.why}</p><div className="cg-lesson-chip"><strong>With AI</strong><span>{guidance.ai}</span></div></section>

      <section className="cg-card"><div className="cg-kicker">Common mistakes</div><h2>What to watch for</h2><div className="cg-bullet-cards">{guidance.mistakes.map((mistake) => <div key={mistake}><span>!</span><p>{mistake}</p></div>)}</div></section>

      <section className="cg-card"><div className="cg-kicker">What Cogni has noticed</div><h2>Thinking patterns</h2>{topPatterns.length ? <div className="cg-pattern-list">{topPatterns.map(([pattern, count]) => { const copy = patternCopy(pattern); return <div className="cg-pattern-row" key={pattern}><div><strong>{copy?.label ?? pattern.replaceAll("_", " ")}</strong><small>{copy?.action ?? "Use the next practice set to see whether this pattern appears again."}</small></div><span className="cg-pill">×{count}</span></div>; })}</div> : <p>No repeated thinking pattern is clear for this skill yet. More answers will make this clearer.</p>}</section>

      {recommendedLesson && <section className="cg-card"><div className="cg-kicker">Recommended lesson</div><h2>{recommendedLesson.title}</h2><p>{recommendedLesson.subtitle}</p><small>Chosen for your {audienceLabel.toLowerCase()} learning context.</small></section>}

      <Link href={`/practice/${slug}`} className="cg-button cg-full">Practise {skill.name} →</Link>
      <Link href="/progress" className="cg-button secondary cg-full">View overall progress</Link>
    </div>
  );
}
