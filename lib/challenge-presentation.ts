import type { Challenge, DailyLesson } from "@/lib/types";

type ChallengeWithPresentation = Challenge & {
  scenario_text?: string | null;
  question_text?: string | null;
};

type PromptParts = { scenario: string | null; question: string };

const optionRewrites: Array<[RegExp, string]> = [
  [/^Check where the information came from,/i, "Check the source, date, method, incentives and whether it supports the claim."],
  [/^Compare how likely each outcome is,/i, "Compare likelihood, downside, how easy it is to undo and the value of waiting."],
  [/^Compare performance before and after adoption within the teams that chose to use the AI/i, "Compare users with a credible control group; do not treat before-and-after change as the AI effect."],
  [/^Test the value case under slower\/lower synergy capture,/i, "Test slower synergies, leadership capacity and the assumptions that would change the price or stop the deal."],
  [/^Compare the value of learning and preserving options against the cost of delay/i, "Compare the value of learning and keeping options open with the cost of delay."],
  [/^Show the base case plus the assumptions carrying it,/i, "Show the base case, key assumptions, downside and what would change your recommendation."],
  [/^That the current support workload is actually caused by tasks the new platform will remove/i, "Whether the platform would remove the real causes of support work rather than integration, data or user issues."],
  [/^Use AI to accelerate the work,/i, "Use AI to speed up the work, but independently verify high-impact claims before committing."],
  [/^Describe the case study as evidence of possibility,/i, "Treat the case study as proof of possibility, then model this client's drivers and realistic range."],
  [/^Redesign the measure to include quality\/outcomes,/i, "Include quality and outcomes, inspect the behaviour created and check whether the incentive serves the real goal."],
  [/^That the delay is actually caused by work an AI tool can remove/i, "Whether AI addresses the real cause of delay rather than approvals, rework, hand-offs or unclear ownership."],
  [/^Ask what the client needs to decide,/i, "Confirm the client's decision, required output, fixed assumptions and timing."],
  [/^Check the new claims and source,/i, "Check the claims and sources, rewrite in your own voice and follow your course rules."],
  [/^Compare risk-adjusted value,/i, "Compare risk-adjusted value, strategic options, constraints, concentration and what each choice prevents."],
  [/^List what you want to learn and what matters for your next step,/i, "List what you want to learn and compare both offers against the same criteria."],
  [/^Show the current recommendation,/i, "State the recommendation, how the missing fact could change it and a reversible next step."],
  [/^Whether the apparently independent sources actually rely on one underlying estimate/i, "Whether the sources rely on one underlying estimate and whether that estimate fits the decision."],
  [/^Have the most senior sponsor review the AI summary/i, "Ask the senior sponsor whether it sounds reasonable, without checking the underlying sources."],
  [/^Require the AI to cite two sources/i, "Proceed automatically if the AI cites two sources and reports high confidence."],
  [/^Test plausible common causes,/i, "Test other causes, selection effects and timing changes against a credible comparison group."],
  [/^The increase is encouraging, but the data does not yet separate/i, "Encouraging, but the data does not separate the campaign effect from the promotion."],
  [/^The result is promising, but the evidence does not yet isolate/i, "Promising, but the evidence does not separate AI impact from workload mix and extra hours."],
  [/^What evidence is missing, how was the claim independently checked,/i, "Ask what evidence is missing, how the claim was checked and what would change the decision?"],
  [/^List the assumptions that must be true for the recommendation to work/i, "List the key assumptions, then test the one most likely to fail."],
  [/^Identify the load-bearing claim,/i, "Find the key claim, check its evidence and assumptions, and test a credible alternative."],
  [/^Ask a second independent AI model/i, "Proceed automatically if a second AI agrees with the first."],
  [/^Run a small pilot immediately/i, "Run a small pilot and treat one encouraging result as proof."],
  [/^Verify how the figure was derived/i, "Verify how the figure was calculated, or remove it until it is supported."],
  [/^Rank initiatives using strategic value,/i, "Rank initiatives by value, delay cost, capacity and dependencies; then stop or defer one."],
  [/^Use what usually happens in similar cases/i, "Use wider incident data and what usually happens, not the most memorable example."],
  [/^Clarify decision boundaries,/i, "Set decision boundaries, escalation rules and checks for higher-risk cases, then let them own the rest."],
  [/^Prestige is only a rough stand-in for quality/i, "Prestige is a weak stand-in for quality and can create status bias."],
  [/^Delay until uncertainty disappears\.?$/i, "Wait until every uncertainty has disappeared."],
];

const phraseRewrites: Array<[RegExp, string]> = [
  [/\bpremature closure\b/gi, "deciding too soon"],
  [/\bevidential support\b/gi, "evidence"],
  [/\bsensitivity (?:analysis|testing)\b/gi, "what-if testing"],
  [/\bbase rate\b/gi, "what usually happens in similar cases"],
  [/\bdecision-grade\b/gi, "ready to use"],
  [/\bneeds corroboration\b/gi, "needs another check"],
  [/\bcorroboration\b/gi, "independent checking"],
  [/\bcorroborate\b/gi, "check with another source"],
  [/\breversibility\b/gi, "how easy it is to undo"],
  [/\bcausal evidence\b/gi, "cause-and-effect evidence"],
  [/\bcausal relationship\b/gi, "cause-and-effect relationship"],
  [/\bcausal claim\b/gi, "cause-and-effect claim"],
  [/\bcausal explanation\b/gi, "cause-and-effect explanation"],
  [/\bcausal link\b/gi, "cause-and-effect link"],
  [/\bcausal\b/gi, "cause-and-effect"],
  [/\bassociation\b/gi, "pattern"],
  [/\bpremise\b/gi, "starting assumption"],
  [/\bproxy\b/gi, "stand-in"],
  [/\bmethodology\b/gi, "method"],
  [/\bmaterially\b/gi, "meaningfully"],
  [/\baggregated\b/gi, "combined"],
  [/\bvariance\b/gi, "variation"],
  [/\bplausibility\b/gi, "whether it seems reasonable"],
  [/\bplausible\b/gi, "credible"],
];

const categoryLabels: Record<string, string> = {
  "Strengthens judgement": "Helps the decision",
  "Weakens judgement": "Hurts the decision",
  "Strengthens credibility": "Builds credibility",
  "Weakens credibility": "Weakens credibility",
  "Verifiable fact": "Can be checked",
  "Decision-grade": "Ready to use",
  "Needs corroboration": "Needs another check",
  "Legitimate evidence": "Useful evidence",
  "Job-relevant evidence": "Relevant evidence",
  "Weak proxy": "Weak stand-in",
  "Potentially aligned": "Supports the goal",
  "Incentive risk": "Risky incentive",
  "Association only": "Pattern only",
  "Causal evidence": "Cause-and-effect evidence",
  Inference: "Conclusion drawn",
  Signal: "Useful signal",
  Noise: "Distraction",
};

export function simplifyLearningCopy(input: string | null | undefined): string {
  let output = String(input ?? "").trim();
  for (const [pattern, replacement] of phraseRewrites) output = output.replace(pattern, replacement);
  return output.replace(/\s+/g, " ").trim();
}

function simplifyOption(input: string): string {
  for (const [pattern, replacement] of optionRewrites) {
    if (pattern.test(input)) return simplifyLearningCopy(replacement);
  }
  return simplifyLearningCopy(input);
}

function splitPrompt(prompt: string): PromptParts {
  const normalized = String(prompt ?? "").replace(/\s+/g, " ").trim();
  const sentenceMatch = normalized.match(/^(.+[.!?][”"']?)\s+([^\s].*)$/);
  if (sentenceMatch) return { scenario: sentenceMatch[1].trim(), question: sentenceMatch[2].trim() };
  const markerMatch = normalized.match(/^(.*?)\s+((?:Which|What|Select|Choose|Rank|Order|Classify|Sort|How|Pick|Put)\s+.*)$/i);
  if (markerMatch && !/^For .+,$/i.test(markerMatch[1].trim())) {
    const task = markerMatch[2].trim();
    return { scenario: markerMatch[1].trim(), question: task.charAt(0).toUpperCase() + task.slice(1) };
  }
  return { scenario: null, question: normalized };
}

function presentInteractionConfig(config: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const safe = { ...(config ?? {}) };
  if (Array.isArray(safe.categories)) {
    safe.categories = safe.categories.map((category) => {
      if (!category || typeof category !== "object") return category;
      const row = category as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label : "";
      return { ...row, label: categoryLabels[label] ?? simplifyLearningCopy(label) };
    });
  }
  if (typeof safe.instructions === "string") safe.instructions = simplifyLearningCopy(safe.instructions);
  return safe;
}

export function presentChallenge<T extends ChallengeWithPresentation>(challenge: T): T {
  const fallback = splitPrompt(challenge.prompt);
  const question = simplifyLearningCopy(challenge.question_text || fallback.question || challenge.prompt);
  const scenario = simplifyLearningCopy(challenge.scenario_text || fallback.scenario || "") || null;
  return {
    ...challenge,
    title: simplifyLearningCopy(challenge.title),
    prompt: question,
    question_text: question,
    scenario_text: scenario,
    scenario_context: simplifyLearningCopy(challenge.scenario_context) || null,
    options: challenge.options.map(simplifyOption),
    interaction_config: presentInteractionConfig(challenge.interaction_config),
  } as T;
}

export function presentLesson<T extends DailyLesson>(lesson: T): T {
  return {
    ...lesson,
    title: simplifyLearningCopy(lesson.title),
    subtitle: simplifyLearningCopy(lesson.subtitle),
    scenario_context: simplifyLearningCopy(lesson.scenario_context) || null,
    content: {
      story: simplifyLearningCopy(lesson.content.story),
      twist: simplifyLearningCopy(lesson.content.twist),
      principle: simplifyLearningCopy(lesson.content.principle),
      try_it: simplifyLearningCopy(lesson.content.try_it),
      reveal: simplifyLearningCopy(lesson.content.reveal),
      ai_age: simplifyLearningCopy(lesson.content.ai_age),
    },
  } as T;
}
