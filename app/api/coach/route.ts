import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

function skillName(value: any) { return Array.isArray(value) ? value[0]?.name : value?.name; }

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { data: scores } = await supabase
    .from("user_skill_scores")
    .select("score,reliability,attempts,skills(name)")
    .eq("user_id", user.id)
    .gt("attempts", 0)
    .order("score");

  if (!scores?.length) return NextResponse.json({ insight: "Complete the diagnostic so Cogni can ground coaching in your actual performance." });

  const weak = scores[0];
  const strong = scores[scores.length - 1];
  const weakName = skillName(weak.skills);
  const strongName = skillName(strong.skills);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ insight: `Your current strongest measured area is ${strongName}. Your highest-value development area is ${weakName}. Keep training there while evidence confidence improves.` });
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5-mini",
    input: `You are Cogni, a concise learning coach. Give one short paragraph with no psychometric claims. Use only this data. Strongest measured area: ${strongName}, score ${strong.score}, reliability ${strong.reliability}. Weakest measured area: ${weakName}, score ${weak.score}, reliability ${weak.reliability}. Explain what the learner should focus on next week.`,
  });
  return NextResponse.json({ insight: response.output_text });
}
