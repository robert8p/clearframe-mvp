import React from "react";
import { Redirect, router } from "expo-router";
import { Body, Card, Eyebrow, ErrorState, LoadingState, Screen, Title } from "@/components/ui";
import { RefreshNotice, TrainingCard } from "@/components/learning-surfaces";
import { apiFetch, todayApiPath } from "@/lib/api";
import { useProGate } from "@/lib/pro-gate";
import { getTrainingAction } from "@/lib/training-action";
import { useFocusResource } from "@/lib/use-focus-resource";
import type { TodayResponse } from "@/lib/types";
const loadToday = (signal:AbortSignal) => apiFetch<TodayResponse>(todayApiPath(),{signal});
export default function TrainHomeScreen() {
  const {data:today,loading,refreshing,error,reload} = useFocusResource(loadToday);
  const { needsProForFocusedPractice, openPaywall } = useProGate();
  if(loading) return <LoadingState label="Choosing today’s training…" />;
  if(!today) return <ErrorState message={error || "Could not load training."} onRetry={()=>void reload()} />;
  if(today.state === "onboarding") return <Redirect href="/onboarding" />;
  const action = getTrainingAction(today);
  const completePro = today.state === "complete" && needsProForFocusedPractice;
  const next = () => completePro ? openPaywall("daily_complete","focused_practice") : action.href ? router.navigate(action.href) : void reload();
  return <Screen refreshing={refreshing} onRefresh={()=>void reload()}>
    <Title size={30}>Your practice</Title>
    {error ? <RefreshNotice message={error} onRetry={()=>void reload()} /> : null}
    <TrainingCard today={today} onPress={next} busy={refreshing} label={completePro ? "Explore more practice" : undefined} />
    <Card><Eyebrow>{today.state === "diagnostic" ? "Why this comes first" : today.state === "complete" ? "Take it into your day" : "A useful rhythm"}</Eyebrow>
      <Body>{today.state === "diagnostic" ? "Start with a mix of common questions and situations that matter to you. Your answers help Cogni choose what to practise next." : today.state === "complete" ? "Notice one assumption in a decision you make today. What evidence would help you check it?" : "Choose an answer, explore the explanation, then pause on the key idea. Accuracy matters less than understanding why."}</Body>
      <Body muted style={{fontSize:14,lineHeight:22}}>{today.state === "diagnostic" ? "There is no pass or fail. Your early scores become more reliable as you practise." : "Your submitted answers are saved. You can leave and come back to your next unanswered question."}</Body>
    </Card>
    {today.state === "lesson" && today.lesson?.scenario_context ? <Card><Eyebrow>{today.situationLabel ?? "Situation"}</Eyebrow><Body>{today.lesson.scenario_context}</Body></Card> : null}
  </Screen>;
}
