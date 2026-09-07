import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Body, Card, Eyebrow, PrimaryButton, ProgressBar, Title } from "./ui";
import { getTrainingAction } from "@/lib/training-action";
import { boundedScore, evidenceLabel, skillDetails, trainingPresentation } from "@/lib/learning-view";
import { MountainScene, SkillMotif, motifForSkill } from "./visuals";
import { colors } from "@/lib/theme";
import type { SkillScore, TodayResponse } from "@/lib/types";

export function TrainingCard({ today, onPress, busy = false, label }: { today:TodayResponse|null; onPress:()=>void; busy?:boolean; label?:string }) {
  const presentation = trainingPresentation(today);
  const action = getTrainingAction(today);
  return <LinearGradient colors={["#243565", "#101a36"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding:20,paddingTop:118,borderRadius:28,borderCurve:"continuous",borderWidth:1,borderColor:"#637eb4",gap:14,overflow:"hidden",boxShadow:"0 10px 32px rgba(42,85,175,.18)" }}>
    <View pointerEvents="none" accessible={false} style={{position:"absolute",top:0,left:0,right:0}}><MountainScene height={188} /><LinearGradient colors={["transparent","#172344"]} locations={[0,1]} style={{position:"absolute",top:65,left:0,right:0,height:124}} /></View>
    <View style={{gap:10}}><Eyebrow>{presentation.eyebrow}</Eyebrow><Title size={28}>{presentation.title}</Title><Body muted style={{fontSize:15,lineHeight:23}}>{presentation.body}</Body></View>
    {presentation.progress !== null ? <ProgressBar value={presentation.progress} /> : null}
    <Text style={{color:colors.muted,fontSize:13,lineHeight:20}}>{presentation.detail}</Text>
    <PrimaryButton testID="training-primary-action" label={busy ? "Loading training…" : label ?? action.label} accessibilityHint={action.hint} trailingArrow loading={busy} onPress={onPress} />
  </LinearGradient>;
}

export function RefreshNotice({ message, onRetry }: {message:string;onRetry:()=>void}) {
  return <Card style={{borderColor:colors.amber}}><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{color:colors.text,fontSize:15,lineHeight:22}}>Couldn’t refresh. Showing the last view from this visit.</Text><Body muted style={{fontSize:14,lineHeight:21}}>{message}</Body><PrimaryButton secondary label="Try again" onPress={onRetry} /></Card>;
}

export function SkillTile({ row, onPress, pro = false }: {row:SkillScore;onPress:()=>void;pro?:boolean}) {
  const [focused,setFocused] = useState(false);
  const { fontScale } = useWindowDimensions();
  const skill = skillDetails(row);
  const measured = Number(row.attempts) > 0;
  const score = boundedScore(row.score);
  const label = evidenceLabel(row);
  const available = Boolean(skill?.slug);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${skill?.name ?? "Skill"}. ${measured ? `Score ${Math.round(score)} out of 100. ` : ""}${label}.${pro ? " Cogni Pro practice." : ""}`} accessibilityHint={pro ? "Explore Cogni Pro for focused practice." : "Start a focused practice round."} accessibilityState={{disabled:!available}} disabled={!available} onPress={onPress} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={({pressed})=>({minHeight:48,opacity:pressed ? .8 : 1})}>
    <Card style={{borderColor:focused ? colors.cyan : colors.lineStrong,gap:12}}>
      <View style={{flexDirection:fontScale>1.3 ? "column" : "row",gap:12,alignItems:"flex-start"}}><SkillMotif kind={motifForSkill(skill?.slug ?? skill?.name ?? "")} size={46} /><View style={{flex:1,gap:5}}><Text style={{color:colors.text,fontSize:18,lineHeight:25,fontWeight:"700"}}>{skill?.name ?? "Skill"}</Text><Text style={{color:colors.muted,fontSize:13,lineHeight:20}}>{label}{measured ? ` · ${row.attempts} observations` : ""}</Text></View><Text style={{color:colors.cyan,fontSize:23,lineHeight:30,fontWeight:"800",fontVariant:["tabular-nums"]}}>{measured ? Math.round(score) : "—"}</Text></View>
      {measured ? <ProgressBar value={score} /> : null}
      {skill?.description ? <Body muted style={{fontSize:14,lineHeight:21}}>{skill.description}</Body> : null}
      <Text style={{color:colors.purple,fontSize:14,lineHeight:21,fontWeight:"700"}}>{!available ? "Practice unavailable" : pro ? "Explore Pro practice →" : "Practise this skill →"}</Text>
    </Card>
  </Pressable>;
}

/** Real, navigable skill names rather than decorative mock buttons. */
export function SkillShelf({ rows, onOpen, pro = false }: {rows:SkillScore[];onOpen:(slug:string)=>void;pro?:boolean}) {
  const {fontScale}=useWindowDimensions();
  const visible=rows.filter(row=>skillDetails(row)?.slug).slice(0,4);
  if (!visible.length) return null;
  return <View style={{gap:12}}><Title size={22}>Explore your thinking</Title><View style={{flexDirection:"row",flexWrap:"wrap",gap:10}}>
    {visible.map(row=>{const raw=skillDetails(row);if(!raw?.slug)return null;const skill={...raw,slug:raw.slug};return <Pressable key={row.skill_id} accessibilityRole="button" accessibilityLabel={`Explore ${skill.name}`} accessibilityHint={pro ? "Explore Pro focused practice" : "Start focused practice"} onPress={()=>onOpen(skill.slug)} style={({pressed})=>({flexBasis:fontScale>1.3?"45%":"21%",flexGrow:1,minWidth:64,minHeight:100,padding:10,borderRadius:19,borderWidth:1,borderColor:colors.lineStrong,backgroundColor:colors.panel,alignItems:"center",gap:10,opacity:pressed ? .8 : 1})}><SkillMotif kind={motifForSkill(skill.slug)} size={42} /><Text style={{color:colors.text,fontSize:12,lineHeight:18,fontWeight:"600",textAlign:"center"}}>{skill.name}</Text></Pressable>})}
  </View></View>;
}
