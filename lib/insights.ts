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

const PATTERN_COPY: Record<
  string,
  { label: string; narrative: string; action: string }
> = {
  evidence_neglect: {
    label: "Evidence neglect",
    narrative:
      "You sometimes challenge the conclusion more readily than the evidence underneath it.",
    action: "Slow down at the evidence layer: source, sample, method and missing counter-evidence.",
  },
  authority_bias: {
    label: "Authority bias",
    narrative:
      "Prestige, confidence or seniority can carry more weight than the underlying evidence deserves.",
    action: "Separate who made the claim from what independently supports it.",
  },
  causal_inference_error: {
    label: "Causal inference",
    narrative:
      "Association can sometimes feel persuasive enough that you move to a causal explanation too quickly.",
    action: "Ask what alternative cause, confounder or experiment would distinguish correlation from causation.",
  },
  premature_closure: {
    label: "Premature closure",
    narrative:
      "You can settle on a plausible answer before testing whether an important alternative or missing fact changes it.",
    action: "Before committing, ask what information could most change your decision.",
  },
  overconfidence: {
    label: "Overconfidence",
    narrative:
      "Your confidence can sometimes run ahead of the evidence available to support the answer.",
    action: "Calibrate confidence to evidence quality, not to how fluent or familiar the answer feels.",
  },
  solutioneering: {
    label: "Solutioneering",
    narrative:
      "You can move toward a solution before the problem has been framed tightly enough.",
    action: "Restate the outcome, constraints and root problem before comparing interventions.",
  },
  confirmation_bias: {
    label: "Confirmation bias",
    narrative:
      "Evidence that supports an initial view can receive more attention than evidence that could falsify it.",
    action: "Actively seek the strongest disconfirming evidence before locking the conclusion.",
  },
  anchoring: {
    label: "Anchoring",
    narrative:
      "An early number or framing can shape later judgement more than it should.",
    action: "Generate an independent estimate or frame before returning to the initial anchor.",
  },
  "sunk-cost_bias": {
    label: "Sunk-cost bias",
    narrative:
      "Past investment can influence the next decision even when only future costs and benefits should matter.",
    action: "Ask what you would choose today if the previous investment had never happened.",
  },
  availability_bias: {
    label: "Availability bias",
    narrative:
      "Recent or vivid examples can feel more representative than the broader evidence base.",
    action: "Look for base rates and representative data before generalising from memorable examples.",
  },
  survivorship_bias: {
    label: "Survivorship bias",
    narrative:
      "Visible successes can dominate the picture when failed or missing cases are harder to observe.",
    action: "Ask which failures disappeared from the dataset or story before drawing lessons from the winners.",
  },
  framing_effect: {
    label: "Framing effect",
    narrative:
      "Equivalent choices can feel different depending on whether they are presented as gains, losses or defaults.",
    action: "Reframe the same decision in neutral terms and check whether your preference changes.",
  },
};

export function patternCopy(pattern?: string | null) {
  if (!pattern) return null;
  return (
    PATTERN_COPY[pattern] ?? {
      label: pattern.replaceAll("_", " "),
      narrative: `A recurring ${pattern.replaceAll("_", " ")} pattern is appearing in your answers.`,
      action: "Use the next few sessions to test whether this pattern persists before treating it as stable.",
    }
  );
}

export function evidenceConfidence(skills: MeasuredSkill[]) {
  if (!skills.length) {
    return {
      label: "Not established",
      detail: "Complete the diagnostic to establish an initial evidence base.",
      percent: 0,
    };
  }

  const averageReliability =
    skills.reduce((sum, skill) => sum + skill.reliability, 0) / skills.length;
  const totalAttempts = skills.reduce((sum, skill) => sum + skill.attempts, 0);
  const percent = Math.round(averageReliability * 100);

  if (averageReliability < 0.2 || totalAttempts < skills.length * 2) {
    return {
      label: "Early — more observations required",
      detail: "Useful as a training direction, but too early to treat the profile as stable.",
      percent,
    };
  }

  if (averageReliability < 0.4) {
    return {
      label: "Developing — directional signal",
      detail: "Several observations now support the pattern, but more repetition is still valuable.",
      percent,
    };
  }

  if (averageReliability < 0.65) {
    return {
      label: "Moderate — pattern becoming stable",
      detail: "Repeated evidence is beginning to make the profile more dependable.",
      percent,
    };
  }

  return {
    label: "Strong — repeated evidence",
    detail: "The current pattern is supported by repeated observations, while remaining developmental rather than diagnostic.",
    percent,
  };
}

export function focusPath(skills: MeasuredSkill[], limit = 3) {
  return [...skills]
    .sort((a, b) => a.score - b.score || a.attempts - b.attempts)
    .slice(0, limit)
    .map((skill) => skill.name);
}

export function strongestSkill(skills: MeasuredSkill[]) {
  return [...skills].sort((a, b) => b.score - a.score || b.attempts - a.attempts)[0] ?? null;
}

export function weakestSkill(skills: MeasuredSkill[]) {
  return [...skills].sort((a, b) => a.score - b.score || a.attempts - b.attempts)[0] ?? null;
}

export function profilePatternNarrative(
  patterns: ErrorPatternCount[],
  weakest?: MeasuredSkill | null,
) {
  const top = [...patterns].sort((a, b) => b.count - a.count)[0];
  const copy = patternCopy(top?.pattern);

  if (copy) return copy.narrative;

  if (weakest) {
    return `No recurring reasoning-error pattern is strong enough to call yet. ${weakest.name} is currently the highest-value area to gather more evidence.`;
  }

  return "No recurring reasoning-error pattern is strong enough to call yet. Cogni will keep testing rather than inventing one.";
}

export function calibrationLabel(accuracy: number, confidence: number) {
  const gap = confidence - accuracy;
  if (gap >= 15) return "Confidence ran ahead of correctness";
  if (gap <= -15) return "You were more accurate than you expected";
  return "Confidence and correctness were broadly aligned";
}

export function sessionInsight(args: {
  accuracy: number;
  averageConfidence: number;
  patterns: ErrorPatternCount[];
  focusSkill?: string | null;
}) {
  const { accuracy, averageConfidence, patterns, focusSkill } = args;
  const top = [...patterns].sort((a, b) => b.count - a.count)[0];
  const copy = patternCopy(top?.pattern);
  const focus = focusSkill ? ` Next, keep pressure on ${focusSkill}.` : "";

  if (copy && top) {
    const frequency = top.count === 1 ? "once" : `${top.count} times`;
    return `${copy.narrative} It appeared ${frequency} in this session.${focus}`;
  }

  if (averageConfidence - accuracy >= 15) {
    return `Your confidence was ${averageConfidence}% while accuracy was ${accuracy}%, so calibration is the clearest signal from this session. Before committing, ask what evidence would make you lower your confidence.${focus}`;
  }

  if (accuracy - averageConfidence >= 15) {
    return `You were more accurate than your confidence suggested (${accuracy}% accuracy vs ${averageConfidence}% confidence). The next gain may be learning when your reasoning deserves more trust.${focus}`;
  }

  if (accuracy === 100) {
    return `You were accurate and well calibrated in this session. The next gain is more challenge, not more reassurance.${focus}`;
  }

  return `Your confidence and correctness were broadly aligned this session. The most useful next step is targeted repetition rather than changing everything at once.${focus}`;
}
