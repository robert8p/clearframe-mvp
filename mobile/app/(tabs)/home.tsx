import React from "react";
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { ActionLink, Body, Card, Eyebrow, ErrorState, LoadingState, MetricCard, Screen, Title } from "@/components/ui";
import { RefreshNotice, SkillTile, TrainingCard } from "@/components/learning-surfaces";
import { apiFetch } from "@/lib/api";
import { mobileAudienceMeta } from "@/lib/audience";
import { selectSkills, skillDetails } from "@/lib/learning-view";
import { getTrainingAction } from "@/lib/training-action";
import { useFocusResource } from "@/lib/use-focus-resource";
import { useProGate } from "@/lib/pro-gate";
import type { MobileProfileResponse, TodayResponse } from "@/lib/types";

async function loadHome(signal:AbortSignal) {
  const [profile,today] = await Promise.all([apiFetch<MobileProfileResponse>("/api/mobile/profile",{signal}),apiFetch<TodayResponse>("/api/mobile/today",{signal})]);
  return {profile,today};
}
export default function HomeScreen() {
  const {data,loading,refreshing,error,reload} = useFocusResource(loadHome);
  const {needsProForFocusedPractice,openFocusedPractice} = useProGate();
  if(loading) return <LoadingState label="Preparing Cogni…" />;
  if(!data) return <ErrorState message={error || "Could not load your practice."} onRetry={()=>void reload()} />;
  const {profile,today} = data;
  if(!profile.profile.audience_segment || today.state === "onboarding") return <Redirect href="/onboarding" />;
  const firstName = profile.profile.full_name?.trim().split(/\s+/)[0] || "there";
  const meta = mobileAudienceMeta(profile.profile.audience_segment);
  const action = getTrainingAction(today);
  const next = selectSkills(profile.skillScores,"","practised").slice(0,2);
  const average = profile.summary.averageScore;
  return <Screen refreshing={refreshing} onRefresh={()=>void reload()}>
    <View style={{gap:6}}><Eyebrow>Your daily practice</Eyebrow><Title size={29}>Hello, {firstName}</Title><Body muted style={{fontSize:15,lineHeight:22}}>{meta?.promise ?? "A little practice. A clearer perspective."}</Body></View>
    {error ? <RefreshNotice message={error} onRetry={()=>void reload()} /> : null}
    <TrainingCard today={today} busy={refreshing} onPress={()=>action.href ? router.navigate(action.href) : void reload()} />
    <View style={{flexDirection:"row",flexWrap:"wrap",gap:12}}><View style={{flexGrow:1,flexBasis:120}}><MetricCard label="Practice XP" value={profile.profile.xp ?? 0} hint="earned, not a grade" /></View><View style={{flexGrow:1,flexBasis:120}}><MetricCard label="Answers" value={profile.summary.answers} hint="your learning history" /></View></View>
    <Card><Eyebrow>Your progress, in context</Eyebrow><Title size={23}>{average === null ? "A starting point, not a score yet" : `${Math.round(average*100)}% recent performance`}</Title><Body muted style={{fontSize:14,lineHeight:22}}>{average === null ? "Your first answers will start building your skill map. There is nothing to catch up on." : "Based on your latest up to 200 answers. It reflects these questions, not your ability or a ranking against others."}</Body><ActionLink label="View progress" hint="Explore your learning evidence and history" onPress={()=>router.navigate("/(tabs)/progress")} /></Card>
    <View style={{gap:12}}><View style={{flexDirection:"row",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:8}}><Title size={23}>{next.length ? "Choose your next focus" : "Make it your own"}</Title><ActionLink label="See all skills" onPress={()=>router.navigate("/(tabs)/skills")} /></View>
      {next.length ? <><Body muted style={{fontSize:14,lineHeight:21}}>Lower measured scores are possible practice areas—not proven weaknesses. Read them alongside the evidence.</Body>{next.map(row=><SkillTile key={row.skill_id} row={row} pro={needsProForFocusedPractice} onPress={()=>{const slug=skillDetails(row)?.slug;if(slug)openFocusedPractice(slug,"home_focus");}} />)}</> : <Body muted>Explore thinking skills, or start with the check above for a more personal starting point.</Body>}
    </View>
  </Screen>;
}
