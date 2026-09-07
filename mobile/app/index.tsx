import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CogniLogo } from "@/components/brand";
import { WelcomeArtwork, SkillMotif } from "@/components/visuals";
import { Body, Eyebrow, LoadingState, PrimaryButton, Screen, Title, ActionLink } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import appConfig from "../app.json";
export default function WelcomeScreen() {
  const {session,loading}=useAuth(); const insets=useSafeAreaInsets();
  if (loading) return <LoadingState />;
  if (session) return <Redirect href="/(tabs)/home" />;
  return <Screen contentStyle={{flexGrow:1,gap:14,paddingTop:insets.top+16}}>
    <View style={{gap:5}}><CogniLogo animated={false} /><Text style={{color:colors.muted,fontSize:13,lineHeight:20,letterSpacing:.8}}>Practice a brighter you.</Text></View>
    <View style={{position:"relative",paddingTop:222,gap:12}}>
      <WelcomeArtwork />
      <View style={{gap:10}}><Eyebrow>Thinking practice for real life</Eyebrow><Title size={40}>Sharpen how you think.</Title><Body muted>Explore a real-life decision. Find a clearer perspective. Take one useful idea into your day.</Body></View>
    </View>
    <View style={{gap:6}}><PrimaryButton label="Try a sample decision" trailingArrow accessibilityHint="Explore three sample decisions, with no account or score" onPress={()=>router.push("/demo")} /><PrimaryButton secondary label="Get started" onPress={()=>router.push("/signup")} /><ActionLink label="I already have an account" onPress={()=>router.push("/login")} /></View>
    <View style={{flexDirection:"row",justifyContent:"space-between",gap:12,paddingVertical:8}}>
      {([{kind:"reasoning",label:"Question clearly"},{kind:"perspective",label:"See another angle"},{kind:"growth",label:"Keep growing"}] as const).map(item=><View key={item.kind} style={{flex:1,gap:9,alignItems:"center"}}><SkillMotif kind={item.kind} size={40} /><Text style={{color:colors.muted,textAlign:"center",fontSize:12,lineHeight:19}}>{item.label}</Text></View>)}
    </View>
    <Text selectable style={{color:colors.soft,fontSize:12,lineHeight:18,textAlign:"center"}}>Cogni {appConfig.expo.version} · Free test preview · Curated content</Text>
  </Screen>;
}
