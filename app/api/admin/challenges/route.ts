import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-check";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({
  title: z.string().min(4),
  prompt: z.string().min(10),
  options: z.array(z.coerce.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  difficulty: z.number().min(20).max(90),
  skillSlug: z.string().min(2),
  explanation: z.string().min(10),
  thinkingPrinciple: z.string().min(10),
  application: z.string().min(10),
});

function rebalanceOptions(options: string[], sourceCorrectIndex: number, targetCorrectIndex: number) {
  const correct = options[sourceCorrectIndex];
  const distractors = options.filter((_, index) => index !== sourceCorrectIndex);
  const balanced: string[] = [];
  let distractorIndex = 0;
  for (let index = 0; index < options.length; index += 1) {
    if (index === targetCorrectIndex) balanced.push(correct);
    else balanced.push(distractors[distractorIndex++]);
  }
  return balanced;
}

export async function POST(req: Request) {
  try {
    if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = Input.parse(await req.json());
    const admin = createAdminClient();
    const { data: skill } = await admin.from("skills").select("id").eq("slug", body.skillSlug).single();
    if (!skill) return NextResponse.json({ error: "Unknown skill slug" }, { status: 400 });

    // Keep future authored MCQs balanced across A/B/C/D rather than relying on authors to randomise positions.
    const { data: keyRows } = await admin.from("challenge_answer_keys").select("correct_index").not("correct_index", "is", null).limit(2000);
    const counts = [0, 0, 0, 0];
    for (const row of keyRows ?? []) {
      const position = Number(row.correct_index);
      if (position >= 0 && position <= 3) counts[position] += 1;
    }
    const targetCorrectIndex = counts.indexOf(Math.min(...counts));
    const options = rebalanceOptions(body.options, body.correctIndex, targetCorrectIndex);

    const id = crypto.randomUUID();
    await admin.from("challenges").insert({
      id,
      title: body.title,
      prompt: body.prompt,
      options,
      challenge_type: "story_mcq",
      interaction_type: "single_choice",
      interaction_config: {},
      difficulty: body.difficulty,
      is_published: true,
      is_diagnostic: false,
      confidence_required: true,
      sort_order: 9999,
    });
    await admin.from("challenge_answer_keys").insert({
      challenge_id: id,
      correct_index: targetCorrectIndex,
      correct_answer: targetCorrectIndex,
      explanation: body.explanation,
      thinking_principle: body.thinkingPrinciple,
      application: body.application,
      error_patterns: {},
    });
    await admin.from("challenge_skill_mapping").insert({ challenge_id: id, skill_id: skill.id, weight: 1 });
    return NextResponse.json({ id, correctPosition: String.fromCharCode(65 + targetCorrectIndex) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
