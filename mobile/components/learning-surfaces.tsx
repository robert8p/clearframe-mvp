import React, { useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Body, Card, Eyebrow, PrimaryButton, ProgressBar, Title } from "./ui";
import { getTrainingAction } from "@/lib/training-action";
import { boundedScore, evidenceLabel, skillDetails, trainingPresentation } from "@/lib/learning-view";
import { colors } from "@/lib/theme";
import type { SkillScore, TodayResponse } from "@/lib/types";

export function TrainingCard({ today, onPress, busy = false, label }: { today:TodayResponse|null; onPress:()=>void; busy?:boolean; label?:string }) {
  const presentation = trainingPresentation(today);
  const action = getTrainingAction(today);
  return <LinearGradient colors={["#1b274a", "#131b32"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding:20,borderRadius:24,borderCurve:"continuous",borderWidth:1,borderColor:colors.lineStrong,gap:16,overflow:"hidden" }}>
    <View pointerEvents="none" accessible={false} style={{ position:"absolute",right:-22,top:-48,width:126,height:126,borderRadius:63,borderWidth:1,borderColor:"rgba(181,162,255,.15)" }} />
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
      <View style={{flexDirection:fontScale>1.3 ? "column" : "row",gap:12,alignItems:"flex-start"}}><View style={{flex:1,gap:5}}><Text style={{color:colors.text,fontSize:18,lineHeight:25,fontWeight:"700"}}>{skill?.name ?? "Skill"}</Text><Text style={{color:colors.muted,fontSize:13,lineHeight:20}}>{label}{measured ? ` · ${row.attempts} observations` : ""}</Text></View><Text style={{color:colors.cyan,fontSize:23,lineHeight:30,fontWeight:"800",fontVariant:["tabular-nums"]}}>{measured ? Math.round(score) : "—"}</Text></View>
      {measured ? <ProgressBar value={score} /> : null}
      {skill?.description ? <Body muted style={{fontSize:14,lineHeight:21}}>{skill.description}</Body> : null}
      <Text style={{color:colors.purple,fontSize:14,lineHeight:21,fontWeight:"700"}}>{!available ? "Practice unavailable" : pro ? "Explore Pro practice →" : "Practise this skill →"}</Text>
    </Card>
  </Pressable>;
}
