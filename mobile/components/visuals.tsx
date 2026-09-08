import React from "react";
import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "@/lib/theme";

const decorative={accessible:false,importantForAccessibility:"no-hide-descendants" as const,pointerEvents:"none" as const};

/** Portrait artwork taken from the approved concept and bundled for deterministic offline rendering. */
export function HeroArtwork({height=340,style}:{height?:number;style?:StyleProp<ImageStyle>}) {
  return <Image {...decorative} source={require("../assets/approved-dreamscape.png")} resizeMode="cover" fadeDuration={0} style={[{width:"100%",height},style]}/>;
}

/** Atmospheric concept-derived artwork for editorial panels and image-led cards. */
export function LandscapeArtwork({height=188}:{height?:number}) {
  return <View {...decorative} style={{height,width:"100%",overflow:"hidden",backgroundColor:colors.bgRaised}}><Image source={require("../assets/approved-dreamscape.png")} resizeMode="cover" fadeDuration={0} style={{width:"100%",height}}/><LinearGradient colors={["rgba(6,13,31,.04)","rgba(7,16,34,.78)"]} locations={[.25,1]} style={{position:"absolute",inset:0}}/></View>;
}

/** Compatibility export: old cards that ask for a mountain scene now receive real artwork. */
export function MountainScene({height=182}:{height?:number}) { return <LandscapeArtwork height={height}/>; }

export function WelcomeArtwork() {
  return <View {...decorative} style={{position:"absolute",inset:0,overflow:"hidden"}}><HeroArtwork height={470}/><LinearGradient colors={["rgba(4,9,22,.04)","rgba(7,16,34,.10)","#071022"]} locations={[0,.48,1]} style={{position:"absolute",inset:0}}/></View>;
}

export type MotifKind="perspective"|"reasoning"|"decisions"|"growth";
export function SkillMotif({kind="reasoning",size=50}:{kind?:MotifKind;size?:number}) {
  const tint=kind==="growth"?colors.green:kind==="decisions"?colors.amber:kind==="perspective"?colors.cyan:colors.purple;
  const bg=kind==="growth"?["rgba(38,93,90,.86)","rgba(16,42,56,.90)"]:kind==="decisions"?["rgba(88,67,92,.86)","rgba(35,39,69,.90)"]:["rgba(47,60,111,.90)","rgba(18,42,69,.92)"];
  const line:ViewStyle={position:"absolute",borderColor:tint,borderWidth:1.6};
  return <LinearGradient {...decorative} colors={bg as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={{width:size,height:size,borderRadius:size*.29,borderWidth:1,borderColor:"rgba(194,214,245,.20)",alignItems:"center",justifyContent:"center"}}>
    {kind==="perspective"?<><View style={{...line,width:size*.50,height:size*.32,borderRadius:size*.28,transform:[{rotate:"-8deg"}]}}/><View style={{width:size*.12,height:size*.12,borderRadius:size*.06,backgroundColor:tint}}/></>:kind==="growth"?<><View style={{...line,width:size*.31,height:size*.49,borderTopLeftRadius:size*.28,borderBottomRightRadius:size*.28,transform:[{rotate:"32deg"}],backgroundColor:"rgba(126,230,185,.10)"}}/><View style={{width:1.6,height:size*.38,backgroundColor:tint,transform:[{rotate:"32deg"}]}}/></>:kind==="decisions"?<><View style={{...line,width:size*.50,height:size*.50,borderRadius:size*.25}}/><View style={{width:0,height:0,borderLeftWidth:size*.06,borderRightWidth:size*.06,borderBottomWidth:size*.28,borderLeftColor:"transparent",borderRightColor:"transparent",borderBottomColor:tint,transform:[{rotate:"35deg"}]}}/></>:<><View style={{...line,left:size*.22,top:size*.25,width:size*.25,height:size*.44,borderRadius:size*.13}}/><View style={{...line,right:size*.22,top:size*.25,width:size*.25,height:size*.44,borderRadius:size*.13}}/><View style={{width:size*.25,height:1.5,backgroundColor:tint,transform:[{rotate:"-30deg"}]}}/></>}
  </LinearGradient>;
}

export function motifForSkill(name:string):MotifKind {const v=name.toLowerCase();return /decision|risk|judg/.test(v)?"decisions":/perspective|bias|evidence/.test(v)?"perspective":/growth|creative|adapt|reflect|mindset/.test(v)?"growth":"reasoning";}

/** Small image-led thumbnail for saved ideas/editorial rows. */
export function InsightArtwork({kind="perspective",size=58}:{kind?:MotifKind;size?:number}) {
  return <View {...decorative} style={{width:size,height:size,borderRadius:radius.md,overflow:"hidden",backgroundColor:colors.panel2}}><Image source={require("../assets/approved-dreamscape.png")} resizeMode="cover" fadeDuration={0} style={{width:size,height:size,transform:[{scale:kind==="growth"?1.35:kind==="decisions"?1.18:1.5}]}}/><LinearGradient colors={kind==="growth"?["rgba(44,159,128,.04)","rgba(18,57,58,.44)"]:kind==="decisions"?["rgba(213,158,92,.03)","rgba(57,41,70,.45)"]:["rgba(63,169,219,.02)","rgba(21,41,76,.46)"]} style={{position:"absolute",inset:0}}/></View>;
}

export type CogniIconName="home"|"skills"|"train"|"progress"|"profile"|"bookmark"|"arrow"|"spark";
export function CogniIcon({name,size=22,color=colors.muted}:{name:CogniIconName;size?:number;color?:string}) {
  const stroke=Math.max(1.5,size*.085);const base={borderColor:color,borderWidth:stroke} as const;
  if(name==="progress") return <View {...decorative} style={{width:size,height:size,flexDirection:"row",alignItems:"flex-end",justifyContent:"center",gap:size*.11}}>{[.38,.64,.9].map((h,i)=><View key={i} style={{width:size*.16,height:size*h,borderRadius:size*.08,backgroundColor:color}}/>)}</View>;
  if(name==="profile") return <View {...decorative} style={{width:size,height:size,alignItems:"center"}}><View style={{width:size*.36,height:size*.36,borderRadius:size*.18,...base}}/><View style={{marginTop:size*.1,width:size*.72,height:size*.36,borderTopLeftRadius:size*.38,borderTopRightRadius:size*.38,...base,borderBottomWidth:0}}/></View>;
  if(name==="skills") return <View {...decorative} style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><View style={{width:size*.62,height:size*.62,borderRadius:size*.16,...base,transform:[{rotate:"45deg"}]}}/><View style={{position:"absolute",width:size*.16,height:size*.16,borderRadius:size*.08,backgroundColor:color}}/></View>;
  if(name==="train") return <View {...decorative} style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><View style={{width:size*.72,height:size*.72,borderRadius:size*.36,...base,alignItems:"center",justifyContent:"center"}}><View style={{width:size*.22,height:size*.22,borderRadius:size*.11,backgroundColor:color}}/></View></View>;
  if(name==="bookmark") return <View {...decorative} style={{width:size*.58,height:size*.75,...base,borderRadius:size*.08,borderBottomWidth:0,transform:[{translateY:size*.05}]}}><View style={{position:"absolute",bottom:-size*.13,left:size*.08,width:size*.29,height:size*.29,borderLeftWidth:stroke,borderBottomWidth:stroke,borderColor:color,transform:[{rotate:"-45deg"}]}}/></View>;
  if(name==="arrow") return <View {...decorative} style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><View style={{width:size*.42,height:size*.42,borderTopWidth:stroke,borderRightWidth:stroke,borderColor:color,transform:[{rotate:"45deg"}],marginLeft:-size*.16}}/></View>;
  if(name==="spark") return <View {...decorative} style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><View style={{width:stroke,height:size*.72,backgroundColor:color,borderRadius:stroke}}/><View style={{position:"absolute",width:size*.72,height:stroke,backgroundColor:color,borderRadius:stroke}}/></View>;
  return <View {...decorative} style={{width:size,height:size,alignItems:"center",justifyContent:"center"}}><View style={{position:"absolute",top:size*.15,width:size*.50,height:size*.50,borderTopWidth:stroke,borderLeftWidth:stroke,borderColor:color,transform:[{rotate:"45deg"}],borderTopLeftRadius:size*.06}}/><View style={{position:"absolute",bottom:size*.12,width:size*.60,height:size*.48,...base,borderTopWidth:0,borderBottomLeftRadius:size*.08,borderBottomRightRadius:size*.08}}/></View>;
}
