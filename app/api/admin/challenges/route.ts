import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin-check";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUDIENCE_SEGMENTS } from "@/lib/audience";

const InteractionType = z.enum(["single_choice", "multi_select", "ranking", "classification", "triage"]);
const allowedAudiences = new Set(["all", ...AUDIENCE_SEGMENTS.map((item) => item.slug)]);

const Input = z.object({
  title: z.string().min(4),
  prompt: z.string().min(10),
  options: z.array(z.coerce.string().min(1)).length(4),
  interactionType: InteractionType.default("single_choice"),
  interactionConfig: z.record(z.string(), z.unknown()).optional().default({}),
  correctIndex: z.number().int().min(0).max(3).nullable().optional(),
  correctAnswer: z.unknown().optional(),
  difficulty: z.number().min(20).max(90),
  skillSlug: z.string().min(2),
  audienceSegments: z.array(z.string()).min(1).default(["all"]),
  scenarioContext: z.string().max(240).optional().default(""),
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

function numberArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(Number).filter(Number.isInteger);
}

function validateAdvancedAnswer(type: z.infer<typeof InteractionType>, options: string[], answer: unknown, config: Record<string, unknown>) {
  if (type === "multi_select") {
    const values = numberArray(answer);
    const unique = [...new Set(values)];
    if (!unique.length || unique.some((value) => value < 0 || value >= options.length)) throw new Error("Choose at least one valid correct option for multi-select.");
    return unique.sort((a, b) => a - b);
  }
  if (type === "ranking") {
    const values = numberArray(answer);
    if (values.length !== options.length || new Set(values).size !== options.length || values.some((value) => value < 0 || value >= options.length)) throw new Error("Ranking answer must contain every option exactly once.");
    return values;
  }
  if (type === "classification") {
    const categories = Array.isArray(config.categories) ? config.categories as Array<{ id?: unknown; label?: unknown }> : [];
    const ids = new Set(categories.map((category) => String(category.id ?? "")).filter(Boolean));
    if (ids.size < 2 || categories.some((category) => !String(category.label ?? "").trim())) throw new Error("Classification requires at least two named categories.");
    if (!answer || typeof answer !== "object" || Array.isArray(answer)) throw new Error("Classification requires a category for every statement.");
    const map = answer as Record<string, unknown>;
    for (let index = 0; index < options.length; index += 1) if (!ids.has(String(map[String(index)] ?? ""))) throw new Error("Classify every statement before publishing.");
    return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, String(value)]));
  }
  return null;
}

export async function POST(req: Request) {
  try {
    if (!(await getAdminUser())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = Input.parse(await req.json());
    if (body.audienceSegments.some((value) => !allowedAudiences.has(value))) throw new Error("Unknown audience segment.");
    if (body.audienceSegments.includes("all") && body.audienceSegments.length > 1) throw new Error("Choose All audiences on its own, or specific audiences.");

    const admin = createAdminClient();
    const { data: skill } = await admin.from("skills").select("id").eq("slug", body.skillSlug).single();
    if (!skill) return NextResponse.json({ error: "Unknown skill slug" }, { status: 400 });

    let options = body.options.map((option) => option.trim());
    let correctIndex: number | null = null;
    let correctAnswer: unknown = null;

    if (body.interactionType === "single_choice") {
      if (typeof body.correctIndex !== "number") throw new Error("Choose the correct MCQ option.");
      const { data: mcqs } = await admin.from("challenges").select("id").eq("is_published", true).eq("interaction_type", "single_choice").limit(2000);
      const ids = (mcqs ?? []).map((row: { id: string }) => row.id);
      const { data: keyRows } = ids.length ? await admin.from("challenge_answer_keys").select("correct_index").in("challenge_id", ids).not("correct_index", "is", null) : { data: [] };
      const counts = [0, 0, 0, 0];
      for (const row of keyRows ?? []) {
        const position = Number(row.correct_index);
        if (position >= 0 && position <= 3) counts[position] += 1;
      }
      const targetCorrectIndex = counts.indexOf(Math.min(...counts));
      options = rebalanceOptions(options, body.correctIndex, targetCorrectIndex);
      correctIndex = targetCorrectIndex;
      correctAnswer = targetCorrectIndex;
    } else if (body.interactionType === "triage") {
      if (typeof body.correctIndex !== "number") throw new Error("Choose the strongest scenario action.");
      correctIndex = body.correctIndex;
      correctAnswer = body.correctIndex;
    } else {
      correctAnswer = validateAdvancedAnswer(body.interactionType, options, body.correctAnswer, body.interactionConfig);
    }

    const typeLabels: Record<z.infer<typeof InteractionType>, string> = {
      single_choice: "story_mcq",
      multi_select: "multi_select_audit",
      ranking: "ranking",
      classification: "classification",
      triage: "scenario_triage",
    };

    const id = crypto.randomUUID();
    const { error: challengeError } = await admin.from("challenges").insert({
      id,
      title: body.title.trim(),
      prompt: body.prompt.trim(),
      options,
      challenge_type: typeLabels[body.interactionType],
      interaction_type: body.interactionType,
      interaction_config: body.interactionConfig,
      difficulty: body.difficulty,
      audience_segments: body.audienceSegments,
      scenario_context: body.scenarioContext.trim() || null,
      is_published: true,
      is_diagnostic: false,
      confidence_required: true,
      sort_order: 9999,
    });
    if (challengeError) throw challengeError;

    try {
      const { error: keyError } = await admin.from("challenge_answer_keys").insert({
        challenge_id: id,
        correct_index: correctIndex,
        correct_answer: correctAnswer,
        explanation: body.explanation.trim(),
        thinking_principle: body.thinkingPrinciple.trim(),
        application: body.application.trim(),
        error_patterns: {},
      });
      if (keyError) throw keyError;
      const { error: mappingError } = await admin.from("challenge_skill_mapping").insert({ challenge_id: id, skill_id: skill.id, weight: 1 });
      if (mappingError) throw mappingError;
    } catch (error) {
      await admin.from("challenges").delete().eq("id", id);
      throw error;
    }

    return NextResponse.json({ id, correctPosition: correctIndex === null ? null : String.fromCharCode(65 + correctIndex), interactionType: body.interactionType });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid challenge" }, { status: 400 });
  }
}
