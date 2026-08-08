export const AUDIENCE_SEGMENTS = [
  {
    slug: "university_student",
    label: "University student",
    shortLabel: "University",
    icon: "🎓",
    description: "Build sharper academic and everyday judgement",
    complexityAnchor: 42,
  },
  {
    slug: "graduate_early_career",
    label: "Graduate / early career",
    shortLabel: "Graduate / early career",
    icon: "🚀",
    description: "Develop the judgement that accelerates your first years at work",
    complexityAnchor: 48,
  },
  {
    slug: "junior_professional",
    label: "Junior professional",
    shortLabel: "Junior professional",
    icon: "💼",
    description: "Make stronger recommendations and challenge weak evidence",
    complexityAnchor: 54,
  },
  {
    slug: "management",
    label: "Management",
    shortLabel: "Management",
    icon: "🧭",
    description: "Improve judgement across people, priorities and decisions",
    complexityAnchor: 61,
  },
  {
    slug: "executive",
    label: "Executive",
    shortLabel: "Executive",
    icon: "♟",
    description: "Sharpen strategic thinking under uncertainty",
    complexityAnchor: 68,
  },
] as const;

export type AudienceSegment = (typeof AUDIENCE_SEGMENTS)[number]["slug"];

export function isAudienceSegment(value: unknown): value is AudienceSegment {
  return AUDIENCE_SEGMENTS.some((item) => item.slug === value);
}

export function audienceMeta(value: unknown) {
  return AUDIENCE_SEGMENTS.find((item) => item.slug === value) ?? null;
}

export function audienceMatches(contentSegments: unknown, audience: AudienceSegment) {
  if (!Array.isArray(contentSegments) || contentSegments.length === 0) return true;
  const values = contentSegments.map(String);
  return values.includes("all") || values.includes(audience);
}

export function audienceDifficultyTarget(audience: AudienceSegment, measuredScore: number) {
  const meta = audienceMeta(audience);
  const anchor = meta?.complexityAnchor ?? 52;
  // Context complexity and demonstrated capability both matter. Seniority is
  // never treated as intelligence: the audience anchor changes the kind of
  // decision and stakes, while observed performance remains the stronger input.
  return Math.round(measuredScore * 0.68 + anchor * 0.32);
}
