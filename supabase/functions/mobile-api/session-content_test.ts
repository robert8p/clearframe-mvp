import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.110.8";
import { loadSessionQuestions, loadSessionAnswer, publicSessionQuestion, validateContentSnapshots, type ContentSnapshot } from "./session-content.ts";
function row(id = "question-1", label = "Original"): ContentSnapshot {
  return { challenge_id: id, challenge: { id, title: label, prompt: `${label} situation. Which answer?`, options: [`${label} correct`, `${label} other`], difficulty: 50, interaction_type: "single_choice", interaction_config: {}, correct_answer: 99 }, answer_key: { challenge_id: id, correct_index: 0, correct_answer: 0, explanation: `${label} reasoning`, thinking_principle: "Test the claim.", application: "Check the source.", error_patterns: {} } };
}
Deno.test("public question never exposes server-only answer fields", () => {
  const snapshot = row(); snapshot.challenge.interaction_config = { instructions: "Choose one.", correctAnswer: 0, answer_key: snapshot.answer_key };
  const question = publicSessionQuestion(snapshot);
  assertEquals(Object.hasOwn(question, "answer_key"), false); assertEquals(Object.hasOwn(question, "correct_answer"), false);
  assertEquals(question.interaction_config, { instructions: "Choose one." });
  assertEquals(JSON.stringify(question).includes("Original reasoning"), false);
});
Deno.test("validation rejects missing, duplicate, unexpected and mismatched snapshots", () => {
  assertThrows(() => validateContentSnapshots(null, ["question-1"]));
  assertThrows(() => validateContentSnapshots([], ["question-1"]));
  assertThrows(() => validateContentSnapshots([row(), row()], ["question-1"]));
  assertThrows(() => validateContentSnapshots([row("other")], ["question-1"]));
  const bad = row(); bad.answer_key.challenge_id = "other";
  assertThrows(() => validateContentSnapshots([bad], ["question-1"]));
  assertEquals(validateContentSnapshots([row()], ["question-1"]).length, 1);
});
Deno.test("fetch binds before display, preserves assignment order, and does not use legacy fallback", async () => {
  const calls: unknown[] = [];
  const admin = { rpc: async (_: string, args: unknown) => { calls.push(args); return { data: [row("b"), row("a")], error: null }; } } as unknown as SupabaseClient;
  const questions = await loadSessionQuestions(admin, "user", "session", ["a", "b"], "training");
  assertEquals(questions.map((q) => q.id), ["a", "b"]);
  assertEquals(calls, [{ p_user_id: "user", p_session_id: "session", p_challenge_ids: ["a", "b"], p_mode: "training", p_legacy_if_missing: false }]);
});
Deno.test("submission uses the same saved question, key and explanation after a bank edit", async () => {
  const saved = row(), current = row("question-1", "Revised");
  current.answer_key.correct_index = 1;
  const calls: Record<string, unknown>[] = [];
  const admin = { rpc: async (_: string, args: Record<string, unknown>) => { calls.push(args); return { data: [saved], error: null }; } } as unknown as SupabaseClient;
  const answer = await loadSessionAnswer(admin, "user", "open-session", "question-1", "diagnostic");
  assertEquals(answer.challenge.prompt, saved.challenge.prompt);
  assertEquals(answer.key.correct_index, 0); assertEquals(answer.key.explanation, "Original reasoning");
  assertEquals(calls[0].p_legacy_if_missing, true);
});
Deno.test("all five formats preserve the saved response shape", async () => {
  for (const [type, expected] of [["single_choice", 0], ["triage", 0], ["multi_select", [0]], ["ranking", [1, 0]], ["classification", { "0": "yes", "1": "no" }]] as const) {
    const saved = row(); saved.challenge.interaction_type = type; saved.answer_key.correct_answer = expected;
    const admin = { rpc: async () => ({ data: [saved], error: null }) } as unknown as SupabaseClient;
    const answer = await loadSessionAnswer(admin, "user", "session", "question-1", "training");
    assertEquals(answer.challenge.interaction_type, type); assertEquals(answer.key.correct_answer, expected);
  }
});
Deno.test("RPC failures fail closed rather than silently grading current content", async () => {
  const admin = { rpc: async () => ({ data: null, error: new Error("Storage unavailable") }) } as unknown as SupabaseClient;
  await assertRejects(() => loadSessionAnswer(admin, "user", "session", "question-1", "training"), Error, "Storage unavailable");
});
