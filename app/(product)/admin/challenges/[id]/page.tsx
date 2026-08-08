import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { audienceMeta } from "@/lib/audience";

function audienceLabel(values: unknown) {
  if (!Array.isArray(values) || values.includes("all")) return "All audiences";
  return values.map((value) => audienceMeta(value)?.label ?? String(value)).join(", ");
}

function answerLabel(correctIndex: number | null, correctAnswer: unknown, options: string[]) {
  if (typeof correctIndex === "number" && options[correctIndex]) {
    return `${String.fromCharCode(65 + correctIndex)}. ${options[correctIndex]}`;
  }
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.map((value) => typeof value === "number" && options[value] ? `${String.fromCharCode(65 + value)}. ${options[value]}` : String(value)).join(" → ");
  }
  if (correctAnswer && typeof correctAnswer === "object") return JSON.stringify(correctAnswer, null, 2);
  return correctAnswer === null || correctAnswer === undefined ? "Not configured" : String(correctAnswer);
}

export default async function AdminChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const [{ data: challenge }, { data: key }, { data: mappings }] = await Promise.all([
    supabase.from("challenges").select("id,title,prompt,options,challenge_type,interaction_type,interaction_config,difficulty,audience_segments,scenario_context,is_published").eq("id", id).maybeSingle(),
    supabase.from("challenge_answer_keys").select("correct_index,correct_answer,explanation,thinking_principle,application,error_patterns").eq("challenge_id", id).maybeSingle(),
    supabase.from("challenge_skill_mapping").select("skill_id,weight,skills(name,slug)").eq("challenge_id", id),
  ]);
  if (!challenge) notFound();
  const options = Array.isArray(challenge.options) ? challenge.options.map(String) : [];
  const answer = answerLabel(key?.correct_index ?? null, key?.correct_answer, options);

  return (
    <div className="cg-grid">
      <Link href="/admin" className="cg-back-link">← Content management</Link>
      <div><div className="cg-kicker">Challenge preview</div><h1>{challenge.title}</h1><p>{challenge.scenario_context || "Universal scenario"}</p></div>
      <div className="cg-grid two">
        <section className="cg-card">
          <div className="cg-kicker">Learner view</div>
          <h2>{challenge.prompt}</h2>
          <div className="cg-admin-preview-options">{options.map((option: string, index: number) => <div key={index}><span>{String.fromCharCode(65 + index)}</span><p>{option}</p></div>)}</div>
        </section>
        <section className="cg-card">
          <div className="cg-kicker">Content metadata</div>
          <div className="cg-admin-detail-list">
            <div><small>Format</small><strong>{String(challenge.interaction_type ?? challenge.challenge_type).replaceAll("_", " ")}</strong></div>
            <div><small>Audience</small><strong>{audienceLabel(challenge.audience_segments)}</strong></div>
            <div><small>Difficulty</small><strong>{challenge.difficulty}</strong></div>
            <div><small>Status</small><strong>{challenge.is_published ? "Published" : "Draft"}</strong></div>
            <div><small>Skill</small><strong>{(mappings ?? []).map((row: any) => Array.isArray(row.skills) ? row.skills[0]?.name : row.skills?.name).filter(Boolean).join(", ") || "Not mapped"}</strong></div>
          </div>
        </section>
      </div>
      <section className="cg-card"><div className="cg-kicker">Correct answer</div><pre className="cg-answer-preview">{answer}</pre></section>
      <section className="cg-card"><div className="cg-kicker">Explanation</div><h2>Why this is stronger</h2><p>{key?.explanation || "No explanation configured."}</p></section>
      <section className="cg-card"><div className="cg-kicker">Thinking principle</div><p>{key?.thinking_principle || "Not configured."}</p><div className="cg-lesson-chip"><strong>AI-age application</strong><span>{key?.application || "Not configured."}</span></div></section>
    </div>
  );
}
