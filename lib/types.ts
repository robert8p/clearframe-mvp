export type Challenge = {
  id: string;
  title: string;
  prompt: string;
  options: string[];
  challenge_type: string;
  difficulty: number;
  confidence_required: boolean;
};

export type AnswerResult = {
  correct: boolean;
  correctIndex: number;
  explanation: string;
  thinkingPrinciple: string;
  application: string;
  errorPattern?: string | null;
  skillUpdates: { slug: string; score: number; reliability: number }[];
  xpEarned: number;
};
