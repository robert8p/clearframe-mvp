export const SKILL_GUIDANCE: Record<string, { why: string; mistakes: string[]; ai: string }> = {
  "critical-thinking": {
    why: "Separate confident presentation from the evidence and reasoning that actually support a conclusion.",
    mistakes: ["Accepting a conclusion before checking the evidence", "Focusing on how an answer sounds instead of whether it is supported", "Stopping at the first explanation that seems plausible"],
    ai: "AI can make almost any answer sound polished. Your job is to check what supports it.",
  },
  "ai-output-verification": {
    why: "Know which AI claims need checking and how to check them quickly.",
    mistakes: ["Trusting a citation without opening the source", "Assuming a precise answer must be accurate", "Checking low-risk and high-risk AI answers in the same way"],
    ai: "You do not need to redo everything AI does. You do need to know which facts matter enough to verify.",
  },
  "evidence-evaluation": {
    why: "Decide whether the evidence is relevant, reliable and strong enough for the claim.",
    mistakes: ["Counting sources instead of checking quality", "Giving status or anecdotes too much weight", "Ignoring whether the comparison is fair"],
    ai: "AI can turn several weak sources into a convincing summary. Strong wording does not make weak evidence stronger.",
  },
  "logical-reasoning": {
    why: "Check whether the starting facts and assumptions really support the conclusion.",
    mistakes: ["Reversing cause and effect", "Treating something possible as if it were certain", "Skipping important steps in the reasoning"],
    ai: "Break AI reasoning into steps and check whether each step really follows.",
  },
  "bias-recognition": {
    why: "Notice common thinking habits that can pull a decision away from the evidence.",
    mistakes: ["Looking mainly for evidence that supports your first view", "Looking only at visible success stories", "Giving status more weight than evidence"],
    ai: "AI can repeat the same biased data and framing that people do, often in more confident language.",
  },
  "decision-uncertainty": {
    why: "Make sensible decisions when you do not have all the information.",
    mistakes: ["Waiting for certainty when a decision is easy to undo", "Moving too quickly when a mistake would be hard to undo", "Missing the value of a small test"],
    ai: "AI can estimate possibilities, but a person still has to decide how much evidence is enough for the stakes.",
  },
  "problem-framing": {
    why: "Make sure you are solving the right problem before choosing a solution.",
    mistakes: ["Starting with a preferred tool", "Confusing a symptom with the underlying problem", "Optimising a measure that does not represent the real goal"],
    ai: "A perfect AI answer to the wrong question is still the wrong answer.",
  },
  "assumption-identification": {
    why: "Notice what must be true for a plan, forecast or recommendation to work.",
    mistakes: ["Treating a forecast as a fact", "Missing assumptions about how people will behave", "Ignoring things outside the model that the plan depends on"],
    ai: "AI often shows you the output more clearly than the assumptions underneath it. Make those assumptions visible before acting.",
  },
  "correlation-causation": {
    why: "Tell the difference between two things moving together and evidence that one caused the other.",
    mistakes: ["Ignoring other possible causes", "Forgetting that the data may include only a selected group", "Treating timing alone as proof of cause and effect"],
    ai: "AI is good at finding patterns. A cause-and-effect claim needs stronger evidence than a pattern alone.",
  },
  "source-quality": {
    why: "Check where a claim came from, how current it is and whether the original source can be checked.",
    mistakes: ["Relying on screenshots or second-hand summaries", "Using out-of-date information", "Trusting a famous organisation name without checking the actual source"],
    ai: "Follow important AI-cited claims back to the original source before they influence a decision.",
  },
  "hallucination-detection": {
    why: "Spot when AI may have invented or overstated a fact, source or quotation.",
    mistakes: ["Trusting a claim because it is very specific", "Failing to check a quotation", "Assuming a plausible-looking reference must exist"],
    ai: "A very specific answer is not automatically a verified answer. Exact claims that matter should be checked.",
  },
  "missing-information": {
    why: "Find the missing information most likely to change the decision.",
    mistakes: ["Missing the number needed to put a result in context", "Ignoring the starting point or comparison group", "Collecting more information that would not change what you do"],
    ai: "AI summaries can hide caveats. Ask what important context is missing before acting on the summary.",
  },
  "argument-comparison": {
    why: "Judge competing views using the same standards instead of choosing the more confident or familiar one.",
    mistakes: ["Using different standards for each side", "Comparing one side's best case with the other's worst case", "Ignoring downside and how easy a choice is to undo"],
    ai: "AI can argue both sides convincingly. Use the same checklist for both so writing quality does not choose the winner.",
  },
  "better-questions": {
    why: "Ask questions whose answers are most likely to change what you do next.",
    mistakes: ["Asking for more detail instead of the evidence that matters", "Asking a leading question", "Failing to ask what would change your mind"],
    ai: "AI can generate many questions. Good judgement decides which question is actually worth asking.",
  },
  "ai-trust-boundaries": {
    why: "Match human review to the possible harm, how easy a mistake is to undo, and whether the AI output can be checked.",
    mistakes: ["Trusting every AI task the same way", "Rejecting AI for every task", "Ignoring the scale of a possible mistake"],
    ai: "The goal is not to trust or distrust AI completely. It is to decide where a person must stay involved.",
  },
};
