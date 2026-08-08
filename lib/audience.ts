export const AUDIENCE_SEGMENTS = [
  {
    slug: "university_student",
    label: "University student",
    shortLabel: "University",
    icon: "🎓",
    description: "Build stronger thinking for study and everyday decisions",
    complexityAnchor: 42,
  },
  {
    slug: "graduate_early_career",
    label: "Graduate / early career",
    shortLabel: "Graduate / early career",
    icon: "🚀",
    description: "Build confidence with early-career decisions and evidence",
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
    description: "Make clearer decisions about people, priorities and risk",
    complexityAnchor: 61,
  },
  {
    slug: "executive",
    label: "Executive",
    shortLabel: "Executive",
    icon: "♟",
    description: "Strengthen strategic decisions when the answer is uncertain",
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
  return Math.round(measuredScore * 0.68 + anchor * 0.32);
}
