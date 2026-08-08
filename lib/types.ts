export type InteractionType =
  | "single_choice"
  | "multi_select"
  | "ranking"
  | "classification"
  | "triage";

export type Challenge = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  challenge_type: string;
  interaction_type: InteractionType;
  interaction_config: Record<string, unknown>;
  difficulty: number;
  confidence_required: boolean;
};

export type AnswerResult = {
  correct: boolean;
  correctIndex?: number | null;
  correctAnswer?: unknown;
  scoreFraction: number;
  explanation: string;
  thinkingPrinciple: string;
  application: string;
  errorPattern?: string | null;
  skillUpdates: { slug: string; name?: string; score: number; reliability: number; delta?: number }[];
  xpEarned: number;
};

export type DailyLesson = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  emoji: string;
  estimated_minutes: number;
  content: {
    story: string;
    twist: string;
    principle: string;
    try_it: string;
    reveal: string;
    ai_age: string;
  };
};
