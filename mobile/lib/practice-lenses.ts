export const PRACTICE_LENSES = [
  { id: "evidence", title: "Confidence is not evidence", principle: "A polished explanation can still be wrong. Look for an independent reason to believe the claim.", prompt: "Choose one confident claim you encounter today. What would count as independent evidence?" },
  { id: "alternatives", title: "Find the missing option", principle: "The first two choices are not always the only choices. Name an alternative before you commit.", prompt: "Take one either-or decision today. Can you find a third option, or a smaller first step?" },
  { id: "change", title: "Make room to change your mind", principle: "Decide what evidence would change your view before you become attached to an answer.", prompt: "Choose a view you currently hold. Finish this sentence: I would reconsider if I learned…" },
  { id: "test", title: "Make the next step reversible", principle: "When uncertainty is high, a small reversible test can be more useful than a big confident prediction.", prompt: "Before making a commitment today, ask: what small test could reduce the uncertainty?" },
  { id: "base-rate", title: "Ask what usually happens", principle: "A memorable example is not the same as a typical result. Look for the wider pattern.", prompt: "Notice an impressive success story today. What happened in the less memorable cases?" },
  { id: "perspective", title: "Borrow another perspective", principle: "People can see the same situation differently because they have different information or priorities.", prompt: "Choose a disagreement. What might the other person know, need or value that you have missed?" },
  { id: "tradeoff", title: "Name the trade-off", principle: "A good choice can still have a cost. Make the sacrifice explicit rather than searching for a perfect option.", prompt: "For one choice today, name both what you gain and what you give up." },
  { id: "ai-check", title: "Check the source, not the style", principle: "When AI cites a source, check that the source exists and supports the specific claim.", prompt: "Pick one useful AI answer. Verify its most important claim outside the conversation." },
  { id: "assumption", title: "Spot the hidden assumption", principle: "A conclusion can depend on something nobody has checked. Separate what is known from what is assumed.", prompt: "Ask of a plan today: what has to be true for this to work? Which part is still an assumption?" },
  { id: "timing", title: "Balance action and waiting", principle: "Waiting for more information also has a cost. Compare the risk of acting with the risk of delay.", prompt: "Choose something you are putting off. What useful information are you waiting for, and when will you decide?" },
  { id: "prediction", title: "Separate a forecast from a fact", principle: "A statement about the future is a prediction, even when it is expressed with certainty.", prompt: "Spot a prediction today. What could make it fail, and how confident should you really be?" },
  { id: "reflection", title: "Review the process, not just the result", principle: "A good outcome can come from a weak decision, and a careful decision can have an unlucky outcome.", prompt: "Look back at a recent choice. What was sensible given what you knew then, and what would you do differently?" },
] as const;
const CONTEXT: Record<string, string> = {
  university_student: "Try it with an assignment, a source or a group-project decision.",
  graduate_early_career: "Try it with a new task, feedback or advice at the start of your career.",
  junior_professional: "Try it with a recommendation, a deadline or an AI-assisted task.",
  management: "Try it with a team priority, a resource decision or a difficult conversation.",
  executive: "Try it with a strategic assumption, an investment case or a major trade-off.",
  casual: "Try it with online information, a purchase or an everyday choice.",
};
export function practiceLens(day: string, audience?: string | null) {
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(day) ? Date.parse(`${day}T12:00:00Z`) : NaN;
  const index = Number.isFinite(stamp) ? Math.abs(Math.floor(stamp / 86400000)) % PRACTICE_LENSES.length : 0;
  return { ...PRACTICE_LENSES[index], context: CONTEXT[audience ?? ""] ?? CONTEXT.casual };
}
export const SAMPLE_DECISIONS = [
  { title: "It sounds convincing. Is it true?", prompt: "An AI assistant gives you a confident answer and three citations. You need to use its main claim. What is the most useful next step?", options: ["Trust it because there are several citations", "Check an original source supports the claim", "Ask the same assistant to sound more certain"], correct: 1, explanation: "Citations are a starting point, not proof. Open a source and check what it actually says; asking the same system again is not independent verification.", principle: "Confidence is not evidence." },
  { title: "One great story, or the usual result?", prompt: "A friend says a course changed their career. You are considering paying for it. What would most improve your decision?", options: ["Find outcomes for people with a similar starting point", "Look for another enthusiastic testimonial", "Assume your result will match your friend’s"], correct: 0, explanation: "Your friend’s experience can be genuine without being typical. Comparable outcomes and your own constraints give you a better basis for deciding.", principle: "A memorable example is not a base rate." },
  { title: "Big promise. Small first step?", prompt: "Your team has an idea that could save time, but you are unsure it will work. What is a useful way forward?", options: ["Commit the whole team immediately", "Wait until there is no uncertainty", "Try a small, reversible test with a clear success measure"], correct: 2, explanation: "A bounded test lets you learn without making the whole commitment. Choose what you will measure and what would make you stop before the test starts.", principle: "Use small tests to reduce uncertainty." },
] as const;
