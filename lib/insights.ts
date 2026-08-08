export type MeasuredSkill = {
  name: string;
  score: number;
  reliability: number;
  attempts: number;
};

export type ErrorPatternCount = {
  pattern: string;
  count: number;
};

const PATTERN_COPY: Record<string, { label: string; narrative: string; action: string }> = {
  evidence_neglect: {
    label: "Not checking the evidence closely enough",
    narrative: "You sometimes question the conclusion without first checking the evidence underneath it.",
    action: "Check the source, sample, method and important missing evidence before deciding.",
  },
  authority_bias: {
    label: "Giving status too much weight",
    narrative: "A confident, senior or prestigious source can sometimes feel more convincing than its evidence deserves.",
    action: "Separate who made the claim from the evidence that supports it.",
  },
  causal_inference_error: {
    label: "Jumping from a pattern to cause and effect",
    narrative: "When two things move together, you can sometimes move too quickly to the idea that one caused the other.",
    action: "Ask what else could explain the pattern and what evidence would separate the explanations.",
  },
  premature_closure: {
    label: "Deciding too early",
    narrative: "You can settle on a plausible answer before checking whether a missing fact or alternative could change it.",
    action: "Before deciding, ask what information could most change your choice.",
  },
  overconfidence: {
    label: "Confidence running ahead of the evidence",
    narrative: "You can sometimes feel more certain than the available evidence supports.",
    action: "Base your confidence on the evidence, not on how smooth or familiar an answer feels.",
  },
  solutioneering: {
    label: "Jumping to a solution",
    narrative: "You can move toward a solution before the problem is clear enough.",
    action: "State the outcome you want, the constraints and the real problem before comparing solutions.",
  },
  confirmation_bias: {
    label: "Looking mainly for supporting evidence",
    narrative: "Evidence that supports your first view can sometimes get more attention than evidence that challenges it.",
    action: "Actively look for strong evidence that could show your preferred answer is wrong.",
  },
  anchoring: {
    label: "Getting stuck on the first number or idea",
    narrative: "An early number or way of describing the problem can influence your later judgement more than it should.",
    action: "Make an independent estimate or describe the problem another way before returning to the first number or idea.",
  },
  "sunk-cost_bias": {
    label: "Letting past effort drive the next decision",
    narrative: "Time or money already spent can pull you toward continuing even when the future case is weak.",
    action: "Ask what you would choose today if the earlier time or money had never been spent.",
  },
  availability_bias: {
    label: "Giving memorable examples too much weight",
    narrative: "Recent or dramatic examples can feel more common or important than the wider evidence shows.",
    action: "Check what usually happens in similar cases and use broader data before generalising from a memorable example.",
  },
  survivorship_bias: {
    label: "Only seeing the winners",
    narrative: "Visible successes can dominate the picture when failed or missing cases are harder to see.",
    action: "Ask which failures, dropouts or excluded cases are missing before judging the success stories.",
  },
  framing_effect: {
    label: "Being swayed by how a choice is worded",
    narrative: "The same choice can feel different depending on whether it is described as a gain, loss or default.",
    action: "Describe the same decision in neutral words and check whether your preference changes.",
  },
};

export function patternCopy(pattern?: string | null) {
  if (!pattern) return null;
  return PATTERN_COPY[pattern] ?? {
    label: pattern.replaceAll("_", " "),
    narrative: `A repeated ${pattern.replaceAll("_", " ")} pattern is appearing in your answers.`,
    action: "Use the next few sessions to see whether this keeps happening before treating it as a stable pattern.",
  };
}

export function evidenceConfidence(skills: MeasuredSkill[]) {
  if (!skills.length) {
    return { label: "Not enough evidence yet", detail: "Complete your starting check to create your first skill profile.", percent: 0 };
  }

  const averageReliability = skills.reduce((sum, skill) => sum + skill.reliability, 0) / skills.length;
  const totalAttempts = skills.reduce((sum, skill) => sum + skill.attempts, 0);
  const percent = Math.round(averageReliability * 100);

  if (averageReliability < 0.2 || totalAttempts < skills.length * 2) {
    return { label: "Early", detail: "Useful for choosing what to practise next, but we need more answers before the pattern is stable.", percent };
  }
  if (averageReliability < 0.4) {
    return { label: "Building", detail: "Several answers now point in the same direction, but more practice will make this clearer.", percent };
  }
  if (averageReliability < 0.65) {
    return { label: "Fairly clear", detail: "Repeated answers are making this skill estimate more dependable.", percent };
  }
  return { label: "Strong", detail: "This skill estimate is supported by repeated answers, but it can still change as you practise.", percent };
}

export function focusPath(skills: MeasuredSkill[], limit = 3) {
  return [...skills].sort((a, b) => a.score - b.score || a.attempts - b.attempts).slice(0, limit).map((skill) => skill.name);
}

export function strongestSkill(skills: MeasuredSkill[]) {
  return [...skills].sort((a, b) => b.score - a.score || b.attempts - a.attempts)[0] ?? null;
}

export function weakestSkill(skills: MeasuredSkill[]) {
  return [...skills].sort((a, b) => a.score - b.score || a.attempts - b.attempts)[0] ?? null;
}

export function profilePatternNarrative(patterns: ErrorPatternCount[], weakest?: MeasuredSkill | null) {
  const top = [...patterns].sort((a, b) => b.count - a.count)[0];
  const copy = patternCopy(top?.pattern);
  if (copy) return copy.narrative;
  if (weakest) return `No repeated thinking pattern is clear yet. ${weakest.name} is the best next area to practise.`;
  return "No repeated thinking pattern is clear yet. Cogni will keep gathering evidence instead of guessing.";
}

export function calibrationLabel(score: number, confidence: number) {
  const gap = confidence - score;
  if (gap >= 15) return "You felt more certain than your results supported";
  if (gap <= -15) return "You did better than you expected";
  return "Your confidence was close to your results";
}

export function sessionInsight(args: {
  accuracy: number;
  averageConfidence: number;
  patterns: ErrorPatternCount[];
  focusSkill?: string | null;
}) {
  const { accuracy: score, averageConfidence, patterns, focusSkill } = args;
  const top = [...patterns].sort((a, b) => b.count - a.count)[0];
  const copy = patternCopy(top?.pattern);
  const focus = focusSkill ? ` Next, keep practising ${focusSkill}.` : "";

  if (copy && top) {
    const frequency = top.count === 1 ? "once" : `${top.count} times`;
    return `${copy.narrative} It appeared ${frequency} in this session.${focus}`;
  }
  if (averageConfidence - score >= 15) {
    return `Your confidence was ${averageConfidence}% while your score was ${score}%. A useful next step is to ask what evidence would make you less certain before committing.${focus}`;
  }
  if (score - averageConfidence >= 15) {
    return `Your score was ${score}% while your confidence was ${averageConfidence}%. You may be underestimating when your reasoning is strong.${focus}`;
  }
  if (score === 100) {
    return `You scored 100% and your confidence was close to your results. The next step is harder practice, not more reassurance.${focus}`;
  }
  return `Your confidence was close to your score. Keep practising the same skill to make the pattern clearer.${focus}`;
}
