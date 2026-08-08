export function expectedSuccess(skillScore: number, difficulty: number) {
  return 1 / (1 + Math.exp((difficulty - skillScore) / 14));
}

export function nextSkillScoreObserved(
  current: number,
  difficulty: number,
  observed: number,
  diagnostic: boolean,
  weight = 1,
) {
  const expected = expectedSuccess(current, difficulty);
  const boundedObserved = Math.max(0, Math.min(1, observed));
  const k = diagnostic ? 12 : 7;
  const delta = k * (boundedObserved - expected) * Math.max(0.4, Math.min(1.4, weight));
  return Math.max(0, Math.min(100, Math.round((current + delta) * 10) / 10));
}

export function nextSkillScore(
  current: number,
  difficulty: number,
  correct: boolean,
  diagnostic: boolean,
  weight = 1,
) {
  return nextSkillScoreObserved(current, difficulty, correct ? 1 : 0, diagnostic, weight);
}

export function reliabilityFromAttempts(attempts: number) {
  return Math.round((1 - Math.exp(-attempts / 8)) * 100) / 100;
}
