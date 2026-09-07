import React, { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { FormField } from "@/components/form-field";
import { RefreshNotice, SkillTile } from "@/components/learning-surfaces";
import { ActionLink, Body, Card, Eyebrow, ErrorState, LoadingState, Screen, Title } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { selectSkills, skillDetails } from "@/lib/learning-view";
import { useProGate } from "@/lib/pro-gate";
import { useFocusResource } from "@/lib/use-focus-resource";
import { colors } from "@/lib/theme";
import type { MobileProfileResponse } from "@/lib/types";
const loadSkills=(signal:AbortSignal)=>apiFetch<MobileProfileResponse>("/api/mobile/profile",{signal});
const filters=[{id:"all",label:"All skills"},{id:"practised",label:"Practised"},{id:"new",label:"New"}] as const;
export default function SkillsScreen() {
  const {data,loading,refreshing,error,reload}=useFocusResource(loadSkills);
  const {needsProForFocusedPractice,openFocusedPractice}=useProGate();
  const [query,setQuery]=useState("");const [filter,setFilter]=useState<"all"|"practised"|"new">("all");
  if(loading)return <LoadingState />;
  if(!data)return <ErrorState message={error || "Could not load skills."} onRetry={()=>void reload()} />;
  if(!data.profile.audience_segment)return <Redirect href="/onboarding" />;
  const rows=selectSkills(data.skillScores,query,filter);
  return <Screen refreshing={refreshing} onRefresh={()=>void reload()}>
    <View style={{gap:7}}><Eyebrow>Your thinking toolkit</Eyebrow><Title>Find your focus</Title><Body muted>Choose a skill for a focused round. A score is a starting point for practice, not a label.</Body></View>
    {error ? <RefreshNotice message={error} onRetry={()=>void reload()} /> : null}
    <FormField label="Search skills" accessibilityLabel="Search skills" placeholder="Try evidence, reasoning or AI" placeholderTextColor={colors.soft} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
    <View accessibilityRole="radiogroup" accessibilityLabel="Filter skills" style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{filters.map(item=><Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{checked:filter===item.id}} onPress={()=>setFilter(item.id)} style={({pressed})=>({minHeight:48,paddingVertical:12,paddingHorizontal:16,borderRadius:14,borderWidth:1,borderColor:filter===item.id ? colors.cyan : colors.lineStrong,backgroundColor:filter===item.id ? colors.panel3 : colors.panel,opacity:pressed ? .8 : 1})}><Text style={{color:colors.text,fontSize:14,lineHeight:21,fontWeight:"700"}}>{item.label}</Text></Pressable>)}</View>
    <Text accessibilityLiveRegion="polite" style={{color:colors.muted,fontSize:13,lineHeight:20}}>{rows.length} {rows.length===1 ? "skill" : "skills"}{needsProForFocusedPractice ? " · Focused practice requires Cogni Pro" : " · Pick one to practise"}</Text>
    {rows.map(row=><SkillTile key={row.skill_id} row={row} pro={needsProForFocusedPractice} onPress={()=>{const slug=skillDetails(row)?.slug;if(slug)openFocusedPractice(slug,"skills_map");}} />)}
    {!rows.length ? <Card><Title size={23}>{data.skillScores.length ? "No skills match yet" : "Your map starts here"}</Title><Body muted>{data.skillScores.length ? "Try a broader search or switch to All skills." : "Complete the starting check to begin your personal skill map."}</Body>{data.skillScores.length ? <ActionLink label="Reset filters" onPress={()=>{setQuery("");setFilter("all");}} /> : <ActionLink label="Go to Train" onPress={()=>router.navigate("/(tabs)/train")} />}</Card> : null}
    <Body muted style={{fontSize:13,lineHeight:21}}>Evidence describes the practice behind a score. It is not a formal assessment or a statistical confidence rating.</Body>
  </Screen>;
}
