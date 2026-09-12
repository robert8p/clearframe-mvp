import type { TodayResponse } from "./types";

/** One action shared by Home and Train. Navigation does not grant API access. */
export function getTrainingAction(today: TodayResponse | null) {
  switch (today?.state) {
    case "diagnostic": return { label: today.answeredChallengeIds?.length ? "Continue starting check" : "Start your check", href: "/(tabs)/train/session" as const, hint: "Open your starting check at the next unanswered question." };
    case "lesson": return { label: "Open today’s insight", href: "/(tabs)/train/lesson" as const, hint: "Read today’s short insight before training." };
    case "training": return { label: today.session?.answeredChallengeIds?.length ? "Continue training" : "Train now", href: "/(tabs)/train/session" as const, hint: "Open your training at the next unanswered question." };
    case "complete": return { label: "Discover topics", href: "/(tabs)/skills" as const, hint: "Explore topics for another practice session." };
    case "onboarding": return { label: "Set up your learning", href: "/onboarding" as const, hint: "Choose the situations you would like to practise." };
    default: return { label: "Try again", href: null, hint: "Try loading today’s training again." };
  }
}
