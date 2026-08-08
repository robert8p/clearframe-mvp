import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { evidenceConfidence, focusPath, patternCopy, type ErrorPatternCount, type MeasuredSkill } from "@/lib/insights";

function nestedSkillName(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { name?: string } | undefined)?.name ?? "Skill";
  if (value && typeof value === "object" && "name" in value) return String((value as { name?: unknown }).name ?? "Skill");
  return "Skill";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const [{ data: scoreRows }, { data: patternRows }] = await Promise.all([
    supabase.from("user_skill_scores").select("score,reliability,attempts,skills(name)").eq("user_id", user.id).gt("attempts", 0).order("score"),
    supabase.from("user_error_patterns").select("pattern,count").eq("user_id", user.id).order("count", { ascending: false }).limit(3),
  ]);
  if (!scoreRows?.length) return NextResponse.json({ insight: "Complete the diagnostic so Cogni can ground coaching in your actual performance." });

  const skills: MeasuredSkill[] = scoreRows.map((row: any) => ({ name: nestedSkillName(row.skills), score: Number(row.score), reliability: Number(row.reliability), attempts: Number(row.attempts) }));
  const patterns: ErrorPatternCount[] = (patternRows ?? []).map((row: any) => ({ pattern: String(row.pattern), count: Number(row.count) }));
  const weakest = [...skills].sort((a, b) => a.score - b.score)[0];
  const strongest = [...skills].sort((a, b) => b.score - a.score)[0];
  const confidence = evidenceConfidence(skills);
  const focus = focusPath(skills, 3);
  const topPattern = patternCopy(patterns[0]?.pattern);
  const deterministic = `Your strongest measured area is ${strongest.name}; your highest-value development area is ${weakest.name}. ${topPattern ? topPattern.narrative : "No recurring reasoning-error pattern is strong enough to call yet."} This week: ${focus.join(" → ")}. Evidence confidence is ${confidence.label.toLowerCase()}.`;

  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ insight: deterministic, source: "grounded_fallback" });

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      input: `You are Cogni, a concise learning coach. Write one useful paragraph, maximum 70 words. Do not make psychometric or personality claims. Use only these facts:\n- strongest measured skill: ${strongest.name}, score ${strongest.score}\n- highest-value development area: ${weakest.name}, score ${weakest.score}\n- evidence confidence: ${confidence.label}\n- top recurring reasoning pattern: ${topPattern?.label ?? "none strong enough yet"}\n- pattern interpretation: ${topPattern?.narrative ?? "no stable error pattern"}\n- weekly focus order: ${focus.join(" -> ")}\nExplain the learner's most useful focus for the coming week.`,
    });
    return NextResponse.json({ insight: response.output_text || deterministic, source: response.output_text ? "ai" : "grounded_fallback" });
  } catch (error) {
    console.error("Coach generation failed; using grounded fallback", error);
    return NextResponse.json({ insight: deterministic, source: "grounded_fallback" });
  }
}
