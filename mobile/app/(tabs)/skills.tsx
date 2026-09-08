import React,{useState}from"react";
import{Redirect,router}from"expo-router";
import{Pressable,Text,View}from"react-native";
import{FormField}from"@/components/form-field";
import{RefreshNotice,SkillTile}from"@/components/learning-surfaces";
import{ActionLink,Body,EditorialPanel,Eyebrow,ErrorState,LoadingState,Screen,SectionHeader,Title}from"@/components/ui";
import{SkillMotif}from"@/components/visuals";
import{apiFetch}from"@/lib/api";
import{selectSkills,skillDetails}from"@/lib/learning-view";
import{useProGate}from"@/lib/pro-gate";
import{useFocusResource}from"@/lib/use-focus-resource";
import{colors,radius,typography}from"@/lib/theme";
import type{MobileProfileResponse}from"@/lib/types";
const loadSkills=(signal:AbortSignal)=>apiFetch<MobileProfileResponse>("/api/mobile/profile",{signal});
const filters=[{id:"all",label:"All skills"},{id:"practised",label:"Practised"},{id:"new",label:"New"}]as const;
export default function SkillsScreen(){const{data,loading,refreshing,error,reload}=useFocusResource(loadSkills);const{needsProForFocusedPractice,openFocusedPractice}=useProGate();const[query,setQuery]=useState("");const[filter,setFilter]=useState<"all"|"practised"|"new">("all");if(loading)return<LoadingState/>;if(!data)return<ErrorState message={error||"Could not load skills."} onRetry={()=>void reload()}/>;if(!data.profile.audience_segment)return<Redirect href="/onboarding"/>;const rows=selectSkills(data.skillScores,query,filter);
return<Screen refreshing={refreshing} onRefresh={()=>void reload()}>
  <EditorialPanel style={{padding:19}}><View style={{flexDirection:"row",alignItems:"center",gap:13}}><View style={{flexDirection:"row",gap:6}}><SkillMotif kind="reasoning" size={42}/><SkillMotif kind="perspective" size={42}/></View><View style={{flex:1,gap:4}}><Eyebrow>Your thinking toolkit</Eyebrow><Title size={29}>Find your focus</Title></View></View><Body muted>Choose a skill for a focused round. A score is a starting point for practice, not a label.</Body></EditorialPanel>
  {error?<RefreshNotice message={error} onRetry={()=>void reload()}/>:null}
  <FormField label="Search skills" accessibilityLabel="Search skills" placeholder="Try evidence, reasoning or AI" placeholderTextColor={colors.soft} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search"/>
  <View accessibilityRole="radiogroup" accessibilityLabel="Filter skills" style={{flexDirection:"row",padding:4,borderRadius:radius.md,borderWidth:1,borderColor:colors.line,backgroundColor:"rgba(9,24,47,.72)",gap:4}}>{filters.map(item=><Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{checked:filter===item.id}} onPress={()=>setFilter(item.id)} style={({pressed})=>({flex:1,minHeight:44,paddingVertical:11,paddingHorizontal:8,borderRadius:14,backgroundColor:filter===item.id?"rgba(79,111,181,.36)":"transparent",opacity:pressed?.8:1,alignItems:"center",justifyContent:"center"})}><Text style={{color:filter===item.id?colors.text:colors.muted,fontSize:13.5,lineHeight:19,...typography.label}}>{item.label}</Text></Pressable>)}</View>
  <SectionHeader title={`${rows.length} ${rows.length===1?"skill":"skills"}`}/>
  {needsProForFocusedPractice?<Text style={{color:colors.muted,fontSize:12.5,lineHeight:18,...typography.body}}>Focused practice is a Cogni Pro feature. Your daily core practice remains available.</Text>:null}
  <View style={{gap:11}}>{rows.map(row=><SkillTile key={row.skill_id} row={row} pro={needsProForFocusedPractice} onPress={()=>{const slug=skillDetails(row)?.slug;if(slug)openFocusedPractice(slug,"skills_map");}}/>)}</View>
  {!rows.length?<EditorialPanel><Title size={22}>{data.skillScores.length?"No skills match yet":"Your map starts here"}</Title><Body muted>{data.skillScores.length?"Try a broader search or switch to All skills.":"Complete the starting check to begin your personal skill map."}</Body>{data.skillScores.length?<ActionLink label="Reset filters" onPress={()=>{setQuery("");setFilter("all");}}/>:<ActionLink label="Go to Train" onPress={()=>router.navigate("/(tabs)/train")}/>}</EditorialPanel>:null}
  <Body muted style={{fontSize:12.5,lineHeight:19}}>Evidence describes the practice behind a score. It is not a formal assessment or a statistical confidence rating.</Body>
</Screen>;}
