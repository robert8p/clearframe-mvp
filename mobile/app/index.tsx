import React from "react";
import { Redirect, router } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CogniLogo } from "@/components/brand";
import { HeroArtwork, SkillMotif } from "@/components/visuals";
import { ActionLink, Body, LoadingState, PrimaryButton, Screen, Title } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors, typography } from "@/lib/theme";
import appConfig from "../app.json";

export default function WelcomeScreen(){
  const{session,loading}=useAuth();const insets=useSafeAreaInsets();const{fontScale}=useWindowDimensions();
  if(loading)return <LoadingState/>;if(session)return <Redirect href="/(tabs)/home"/>;
  const heroHeight=fontScale>1.35?560:520;
  return <Screen atmospheric={false} contentStyle={{gap:16,paddingTop:Math.max(insets.top,8)}}>
    <View style={{marginHorizontal:-20,height:heroHeight,borderBottomLeftRadius:34,borderBottomRightRadius:34,overflow:"hidden",backgroundColor:colors.bgDeep}}>
      <HeroArtwork height={heroHeight}/>
      <LinearGradient colors={["rgba(4,9,22,.10)","rgba(4,9,22,.03)","rgba(7,16,34,.48)","#071022"]} locations={[0,.34,.67,1]} style={{position:"absolute",inset:0}}/>
      <View style={{position:"absolute",left:22,right:22,top:14,gap:3}}><CogniLogo animated={false}/><Text style={{color:"rgba(231,237,255,.78)",fontSize:13.5,lineHeight:20,...typography.body,letterSpacing:1.1}}>Practice a brighter you.</Text></View>
      <View style={{position:"absolute",left:22,right:22,bottom:24,gap:10}}><Title size={fontScale>1.35?36:42}>Sharpen how you think.</Title><Body style={{maxWidth:520,fontSize:17,lineHeight:25}}>Real-life thinking practice for a calmer, clearer, more capable you.</Body></View>
    </View>

    <View style={{gap:10}}><PrimaryButton label="Get started" trailingArrow onPress={()=>router.push("/signup")}/><PrimaryButton secondary label="Try a sample decision" accessibilityHint="Explore three sample decisions, with no account or score" onPress={()=>router.push("/demo")}/><ActionLink label="I already have an account" onPress={()=>router.push("/login")}/></View>

    <View style={{flexDirection:"row",gap:10,paddingVertical:8}}>{([{kind:"reasoning",label:"Think clearly"},{kind:"perspective",label:"See another angle"},{kind:"growth",label:"Grow by practice"}] as const).map(item=><View key={item.kind} style={{flex:1,alignItems:"center",gap:8}}><SkillMotif kind={item.kind} size={42}/><Text style={{color:colors.muted,textAlign:"center",fontSize:12,lineHeight:18,...typography.bodyMedium}}>{item.label}</Text></View>)}</View>
    <Text selectable style={{color:colors.faint,fontSize:11.5,lineHeight:17,textAlign:"center",...typography.body}}>Cogni {appConfig.expo.version} · Free test preview · Curated content</Text>
  </Screen>;
}
