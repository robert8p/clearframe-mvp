import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusResource } from "@/lib/use-focus-resource";
import { RefreshNotice } from "@/components/learning-surfaces";
import { ProgressHistoryCard, ScoreExplainer, type ProgressHistory } from "@/components/progress-history";
import { apiFetch } from "@/lib/api";
import { useProGate } from "@/lib/pro-gate";
import { ToolkitShortcut } from "@/components/practice-tools";
import { CogniIcon } from "@/components/visuals";
import { colors, radius, typography } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
import { Body, EditorialPanel, Eyebrow, ErrorState, LoadingState, MetricCard, PrimaryButton, ProgressRing, Screen, SectionHeader, SkillBar, Title } from "@/components/ui";

function relation(value:MobileProfileResponse["skillScores"][number]["skills"]){return Array.isArray(value)?value[0]:value;}
async function loadProgress(signal:AbortSignal){const[profile,historyResult]=await Promise.all([apiFetch<MobileProfileResponse>("/api/mobile/profile",{signal}),apiFetch<ProgressHistory>("/api/mobile/progress-history",{signal}).then(history=>({history,error:""})).catch((error:unknown)=>({history:null,error:error instanceof Error?error.message:"Progress history is unavailable."}))]);return{profile,...historyResult};}

export default function ProgressScreen(){
  const{fontScale,width}=useWindowDimensions();const{data:resource,loading,refreshing,error,reload}=useFocusResource(loadProgress);const{needsProForFocusedPractice,isPro,openFocusedPractice,openPaywall}=useProGate();const data=resource?.profile;const history=resource?.history??null;
  if(loading)return <LoadingState/>;if(!data)return <ErrorState message={error||"Could not load progress."} onRetry={()=>void reload()}/>;
  const average=data.summary.averageScore==null?null:Math.round(data.summary.averageScore*100);const measured=data.skillScores.filter(row=>row.attempts>0);const next=[...measured].sort((a,b)=>Number(a.score)-Number(b.score))[0];const nextSkill=next?relation(next.skills):null;const nextSkillSlug=nextSkill?.slug;
  return <Screen refreshing={refreshing} onRefresh={()=>void reload()}>
    {error?<RefreshNotice message={error} onRetry={()=>void reload()}/>:null}
    <View style={{gap:5}}><Eyebrow>Growth you can inspect</Eyebrow><Title>Your progress, in perspective</Title><Body muted style={{maxWidth:620}}>A clearer view of what you have practised, how much evidence sits behind each score, and where you might explore next.</Body></View>

    <LinearGradient colors={["rgba(30,70,126,.96)","rgba(36,37,92,.95)"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{borderRadius:radius.xl,borderWidth:1,borderColor:"rgba(135,181,234,.28)",padding:19,gap:17,overflow:"hidden"}}>
      <View style={{position:"absolute",right:-35,top:-45,width:160,height:160,borderRadius:80,backgroundColor:"rgba(105,235,255,.08)"}}/>
      <View style={{flexDirection:fontScale>1.25||width<360?"column":"row",alignItems:"center",gap:18}}><ProgressRing value={average} label="recent"/><View style={{flex:1,gap:7,alignSelf:"stretch",justifyContent:"center"}}><Eyebrow style={{color:"#9DF2FF"}}>Recent performance</Eyebrow><Text style={{color:colors.text,fontSize:23,lineHeight:29,...typography.heading}}>{average!==null?"Your profile is taking shape":"Your profile starts with practice"}</Text><Text style={{color:colors.muted,fontSize:13.5,lineHeight:20,...typography.body}}>{measured.length} measured skills · latest up to 200 answers</Text></View></View>
      <View style={{height:1,backgroundColor:"rgba(201,221,255,.13)"}}/>
      <View style={{flexDirection:"row",gap:18}}><MetricCard label="XP" value={data.profile.xp??0} hint="earned"/><MetricCard label="Streak" value={`${data.profile.current_streak??0}d`} hint="current"/><MetricCard label="Answers" value={data.summary.answers} hint="saved"/></View>
    </LinearGradient>

    <View style={{gap:11}}><SectionHeader title="Saved ideas"/><ToolkitShortcut/></View>

    {resource?.error?<EditorialPanel><Eyebrow>History unavailable</Eyebrow><Body muted>Your current scores are available, but history could not be loaded. It has not been reset.</Body><PrimaryButton label="Retry history" secondary onPress={()=>void reload()}/></EditorialPanel>:null}
    {history?<ProgressHistoryCard history={history} showUpgrade={history.access==="limited"&&!isPro} onUpgrade={()=>openPaywall("progress_history","progress_history")}/>:null}

    <View style={{gap:12}}><SectionHeader title="Your skill profile"/><EditorialPanel>{measured.length?[...measured].sort((a,b)=>Number(a.score)-Number(b.score)).map((row,index)=><View key={row.skill_id} style={{gap:12}}>{index?<View style={{height:1,backgroundColor:colors.line}}/>:null}<SkillBar label={relation(row.skills)?.name??"Skill"} score={Number(row.score)} reliability={Number(row.reliability)}/></View>):<Body muted>Complete your starting check to begin tracking your skill progress.</Body>}</EditorialPanel></View>

    {nextSkill&&nextSkillSlug?<EditorialPanel style={{borderColor:"rgba(109,235,255,.26)"}}><View style={{flexDirection:"row",alignItems:"center",gap:12}}><View style={{width:42,height:42,borderRadius:21,backgroundColor:"rgba(109,235,255,.10)",alignItems:"center",justifyContent:"center"}}><CogniIcon name="train" size={22} color={colors.cyan}/></View><View style={{flex:1}}><Eyebrow>Practice focus</Eyebrow></View></View><Title size={23}>Sharpen {nextSkill.name}</Title><Body muted>{needsProForFocusedPractice?"Your daily core training remains free. Cogni Pro unlocks additional focused rounds on a skill you choose to practise.":"This is one of your lower measured scores. Use it as a possible focus—not a judgement."}</Body><PrimaryButton label={needsProForFocusedPractice?`Unlock practice for ${nextSkill.name}`:`Practise ${nextSkill.name}`} onPress={()=>openFocusedPractice(nextSkillSlug,"progress_next_move")}/></EditorialPanel>:null}
    <ScoreExplainer/>
  </Screen>;
}
