import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Body, EditorialPanel, Eyebrow, PrimaryButton, ProgressBar, SectionHeader, Title } from "./ui";
import { getTrainingAction } from "@/lib/training-action";
import { boundedScore, evidenceLabel, skillDetails, trainingPresentation } from "@/lib/learning-view";
import { CogniIcon, LandscapeArtwork, SkillMotif, motifForSkill } from "./visuals";
import { colors, radius, typography } from "@/lib/theme";
import type { SkillScore, TodayResponse } from "@/lib/types";

export function TrainingCard({today,onPress,busy=false,label}:{today:TodayResponse|null;onPress:()=>void;busy?:boolean;label?:string}) {
  const presentation=trainingPresentation(today);const action=getTrainingAction(today);
  return <View style={{minHeight:360,borderRadius:radius.xl,borderCurve:"continuous",overflow:"hidden",borderWidth:1,borderColor:"rgba(142,185,239,.32)",backgroundColor:colors.panel,boxShadow:"0 18px 44px rgba(0,0,0,.26)"}}>
    <View pointerEvents="none" accessible={false} style={{position:"absolute",inset:0}}><LandscapeArtwork height={360}/><LinearGradient colors={["rgba(7,16,34,.04)","rgba(7,16,34,.28)","#0a1830"]} locations={[0,.38,.74]} style={{position:"absolute",inset:0}}/></View>
    <View style={{flex:1,justifyContent:"flex-end",padding:20,gap:13,paddingTop:130}}>
      <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10}}><Eyebrow>Today’s practice</Eyebrow><View style={{paddingHorizontal:10,paddingVertical:6,borderRadius:999,backgroundColor:"rgba(8,20,42,.58)",borderWidth:1,borderColor:colors.lineStrong}}><Text style={{color:colors.text,fontSize:12,...typography.label}}>About 5 min</Text></View></View>
      <Title size={29}>{presentation.title}</Title>
      <Body muted style={{fontSize:15,lineHeight:22,maxWidth:510}}>{presentation.body}</Body>
      {presentation.progress!==null?<ProgressBar value={presentation.progress}/>:null}
      <Text style={{color:colors.muted,fontSize:12.5,lineHeight:19,...typography.body}}>{presentation.detail}</Text>
      <PrimaryButton testID="training-primary-action" label={busy?"Loading training…":label??action.label} accessibilityHint={action.hint} trailingArrow loading={busy} onPress={onPress}/>
    </View>
  </View>;
}

export function RefreshNotice({message,onRetry}:{message:string;onRetry:()=>void}) {return <EditorialPanel style={{borderColor:"rgba(255,209,147,.38)"}}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{color:colors.text,fontSize:15,lineHeight:22,...typography.bodyMedium}}>Couldn’t refresh. Showing the last view from this visit.</Text><Body muted style={{fontSize:14,lineHeight:21}}>{message}</Body><PrimaryButton secondary label="Try again" onPress={onRetry}/></EditorialPanel>;}

export function SkillTile({row,onPress,pro=false}:{row:SkillScore;onPress:()=>void;pro?:boolean}) {
  const [focused,setFocused]=useState(false);const {fontScale}=useWindowDimensions();const skill=skillDetails(row);const measured=Number(row.attempts)>0;const score=boundedScore(row.score);const label=evidenceLabel(row);const available=Boolean(skill?.slug);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${skill?.name??"Skill"}. ${measured?`Score ${Math.round(score)} out of 100. `:""}${label}.${pro?" Cogni Pro practice.":""}`} accessibilityHint={pro?"Explore Cogni Pro for focused practice.":"Start a focused practice round."} accessibilityState={{disabled:!available}} disabled={!available} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={({pressed})=>({opacity:pressed?.82:1})}>
    <View style={{minHeight:112,padding:15,borderRadius:radius.lg,borderWidth:1,borderColor:focused?colors.cyan:colors.line,backgroundColor:"rgba(13,30,56,.78)",gap:11}}>
      <View style={{flexDirection:fontScale>1.45?"column":"row",gap:13,alignItems:"center"}}><SkillMotif kind={motifForSkill(skill?.slug??skill?.name??"")} size={48}/><View style={{flex:1,gap:4,alignSelf:"stretch",justifyContent:"center"}}><Text style={{color:colors.text,fontSize:17,lineHeight:23,...typography.heading}}>{skill?.name??"Skill"}</Text><Text style={{color:colors.muted,fontSize:12.5,lineHeight:18,...typography.body}}>{label}{measured?` · ${row.attempts} observations`:""}</Text></View>{measured?<Text style={{color:colors.cyan,fontSize:25,lineHeight:30,...typography.metric,fontVariant:["tabular-nums"]}}>{Math.round(score)}</Text>:<CogniIcon name="arrow" color={colors.soft}/>}</View>
      {measured?<ProgressBar value={score}/>:null}
      {skill?.description?<Body muted style={{fontSize:13.5,lineHeight:20}}>{skill.description}</Body>:null}
      <Text style={{color:colors.blue,fontSize:13.5,lineHeight:20,...typography.label}}>{!available?"Practice unavailable":pro?"Explore Pro practice":"Practise this skill"}</Text>
    </View>
  </Pressable>;
}

export function SkillShelf({rows,onOpen,pro=false}:{rows:SkillScore[];onOpen:(slug:string)=>void;pro?:boolean}) {
  const {fontScale,width}=useWindowDimensions();const columns=fontScale>1.75?1:width<600||fontScale>1.2?2:4;const visible=rows.filter(row=>skillDetails(row)?.slug).slice(0,4);if(!visible.length)return null;
  return <View style={{gap:12}}><SectionHeader title="Explore your thinking"/><View style={{flexDirection:"row",flexWrap:"wrap",gap:10}}>{visible.map(row=>{const skill=skillDetails(row);const slug=skill?.slug;if(!skill||!slug)return null;return <Pressable key={row.skill_id} accessibilityRole="button" accessibilityLabel={`Explore ${skill.name}`} accessibilityHint={pro?"Explore Pro focused practice":"Start focused practice"} onPress={()=>onOpen(slug)} style={({pressed})=>({flexBasis:columns===1?"100%":columns===2?"45%":"21%",flexGrow:1,minWidth:columns===1?0:104,minHeight:112,padding:13,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:"rgba(13,29,55,.78)",alignItems:"center",justifyContent:"center",gap:9,opacity:pressed?.8:1})}><SkillMotif kind={motifForSkill(slug)} size={44}/><Text numberOfLines={fontScale>1.3?undefined:2} style={{color:colors.text,fontSize:13,lineHeight:18,...typography.label,textAlign:"center"}}>{skill.name}</Text></Pressable>;})}</View></View>;
}
