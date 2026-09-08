import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { ActionLink, Body, EditorialPanel, Eyebrow, LoadingState, PrimaryButton, Screen, SectionHeader, Title } from "@/components/ui";
import { RefreshNotice, SkillShelf, SkillTile, TrainingCard } from "@/components/learning-surfaces";
import { DailyLens, DeviceToolsNotice, PracticeRhythm, ToolkitShortcut } from "@/components/practice-tools";
import { CogniLogo } from "@/components/brand";
import { CogniIcon } from "@/components/visuals";
import { apiFetch } from "@/lib/api";
import { mobileAudienceMeta } from "@/lib/audience";
import { selectSkills, skillDetails } from "@/lib/learning-view";
import { getTrainingAction } from "@/lib/training-action";
import { useFocusResource } from "@/lib/use-focus-resource";
import { useProGate } from "@/lib/pro-gate";
import { colors, typography } from "@/lib/theme";
import type { MobileProfileResponse, TodayResponse } from "@/lib/types";

async function loadHome(signal:AbortSignal){const[profile,today]=await Promise.all([apiFetch<MobileProfileResponse>("/api/mobile/profile",{signal}),apiFetch<TodayResponse>("/api/mobile/today",{signal})]);return{profile,today};}
export default function HomeScreen(){
  const{data,loading,refreshing,error,reload}=useFocusResource(loadHome);const{needsProForFocusedPractice,openFocusedPractice}=useProGate();
  if(loading)return <LoadingState label="Preparing Cogni…"/>;
  if(!data)return <Screen><Title size={27}>Let’s reconnect.</Title><Body muted>{error||"Could not load your practice."}</Body><PrimaryButton label="Try again" onPress={()=>void reload()}/><ToolkitShortcut/><Body muted style={{fontSize:13,lineHeight:20}}>Saved ideas on this device are still available. New questions and scores need a connection.</Body></Screen>;
  const{profile,today}=data;if(!profile.profile.audience_segment||today.state==="onboarding")return <Redirect href="/onboarding"/>;
  const firstName=profile.profile.full_name?.trim().split(/\s+/)[0]||"there";const meta=mobileAudienceMeta(profile.profile.audience_segment);const action=getTrainingAction(today);const next=selectSkills(profile.skillScores,"","practised").slice(0,2);const average=profile.summary.averageScore;
  return <Screen refreshing={refreshing} onRefresh={()=>void reload()}>
    <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12}}><View style={{gap:4,flex:1}}><CogniLogo compact animated={false}/><Text style={{color:colors.muted,fontSize:12.5,lineHeight:18,...typography.body}}>{meta?.shortLabel??"Small practice. A sharper you."}</Text></View><View accessibilityLabel={`${profile.profile.current_streak??0} day streak`} style={{width:42,height:42,borderRadius:21,borderWidth:1,borderColor:colors.line,backgroundColor:"rgba(13,31,58,.7)",alignItems:"center",justifyContent:"center"}}><CogniIcon name="spark" size={19} color={colors.cyan}/></View></View>
    <View style={{gap:4}}><Eyebrow>Today</Eyebrow><Title size={29}>A brighter day, {firstName}</Title></View>
    {error?<RefreshNotice message={error} onRetry={()=>void reload()}/>:null}
    <TrainingCard today={today} busy={refreshing} onPress={()=>action.href?router.navigate(action.href):void reload()}/>

    <SkillShelf rows={profile.skillScores} pro={needsProForFocusedPractice} onOpen={slug=>openFocusedPractice(slug,"home_skill_shelf")}/>
    <PracticeRhythm/>

    <View style={{gap:12}}><SectionHeader title="Keep going"/><ToolkitShortcut/><DailyLens audience={profile.profile.audience_segment}/></View>
    <DeviceToolsNotice/>

    <EditorialPanel>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12}}><View style={{flex:1,gap:5}}><Eyebrow>Your progress</Eyebrow><Title size={22}>{average===null?"Your starting point is taking shape":`${Math.round(average*100)}% recent performance`}</Title><Text style={{color:colors.muted,fontSize:13,lineHeight:19,...typography.body}}>{profile.summary.answers} answers saved · {profile.profile.xp??0} practice XP</Text></View><CogniIcon name="progress" size={30} color={colors.cyan}/></View>
      <Body muted style={{fontSize:13,lineHeight:20}}>{average===null?"Your first answers begin your skill map. There is nothing to catch up on.":"Based on your latest up to 200 answers—not a measure of intelligence or a ranking against other people."}</Body>
      <ActionLink label="View progress" hint="Explore the evidence and history behind your skill scores" onPress={()=>router.navigate("/(tabs)/progress")}/>
    </EditorialPanel>

    {next.length?<View style={{gap:12}}><SectionHeader title="Choose your next focus" action={<ActionLink label="See all skills" onPress={()=>router.navigate("/(tabs)/skills")}/>}/>{next.map(row=><SkillTile key={row.skill_id} row={row} pro={needsProForFocusedPractice} onPress={()=>{const slug=skillDetails(row)?.slug;if(slug)openFocusedPractice(slug,"home_focus");}}/>)}</View>:null}
  </Screen>;
}
