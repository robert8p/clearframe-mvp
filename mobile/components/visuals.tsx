import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { colors, glow, radius } from "@/lib/theme";

const decorative={accessible:false,importantForAccessibility:"no-hide-descendants" as const,pointerEvents:"none" as const};

const stars=[
  {left:"9%",top:34,size:1.5,opacity:.44},{left:"18%",top:92,size:1,opacity:.32},{left:"31%",top:48,size:1.5,opacity:.50},
  {left:"44%",top:128,size:1,opacity:.28},{left:"62%",top:44,size:2,opacity:.46},{left:"74%",top:104,size:1.4,opacity:.36},
  {left:"86%",top:66,size:1,opacity:.42},{left:"92%",top:152,size:1.5,opacity:.26}
] as const;

function StarField({opacity=1}:{opacity?:number}) {
  return <>{stars.map((star,index)=><View key={index} style={{position:"absolute",left:star.left,top:star.top,width:star.size,height:star.size,borderRadius:star.size,backgroundColor:`rgba(248,250,252,${star.opacity*opacity})`}}/>)}</>;
}

function HorizonBand({height}:{height:number}) {
  const bandHeight=Math.max(84,height*.38);
  return <>
    <View style={{position:"absolute",left:"-22%",right:"-22%",bottom:-bandHeight*.68,height:bandHeight,borderTopLeftRadius:999,borderTopRightRadius:999,borderWidth:1,borderColor:"rgba(111,168,255,.34)",backgroundColor:"rgba(8,26,55,.68)",boxShadow:"0 -12px 36px rgba(37,99,235,.20)"}}/>
    <LinearGradient colors={["transparent","rgba(34,211,238,.32)","rgba(248,250,252,.10)","transparent"]} locations={[0,.42,.50,1]} start={{x:0,y:0}} end={{x:1,y:0}} style={{position:"absolute",left:"-16%",right:"-16%",bottom:bandHeight*.12,height:3}}/>
  </>;
}

/** Abstract orbital brand artwork rendered natively, with no character imagery. */
export function HeroArtwork({height=340,style}:{height?:number;style?:StyleProp<ViewStyle>}) {
  const markSize=Math.min(190,Math.max(118,height*.52));
  return <View {...decorative} style={[{width:"100%",height,overflow:"hidden",backgroundColor:colors.bgDeep},style]}>
    <LinearGradient colors={[colors.bgDeep,"#0A2147",colors.bg]} start={{x:.08,y:0}} end={{x:.94,y:1}} style={{position:"absolute",inset:0}}/>
    <StarField opacity={.9}/>
    <HorizonBand height={height}/>
    <LinearGradient colors={["transparent","rgba(245,158,11,.16)","rgba(37,99,235,.08)"]} locations={[0,.68,1]} start={{x:0,y:.45}} end={{x:1,y:.45}} style={{position:"absolute",left:"28%",right:"-12%",bottom:Math.max(14,height*.13),height:Math.max(58,height*.20)}}/>
    <View style={{position:"absolute",right:"9%",top:Math.max(30,height*.16),opacity:.95,boxShadow:glow.blue}}><CogniMark size={markSize}/></View>
  </View>;
}

/** Atmospheric abstract artwork for editorial panels and image-led cards. */
export function LandscapeArtwork({height=188}:{height?:number}) {
  const markSize=Math.min(104,Math.max(68,height*.54));
  return <View {...decorative} style={{height,width:"100%",overflow:"hidden",backgroundColor:colors.bgRaised}}>
    <LinearGradient colors={["#061026","#0B2247","#081026"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:"absolute",inset:0}}/>
    <StarField opacity={.56}/>
    <HorizonBand height={height}/>
    <View style={{position:"absolute",right:24,top:Math.max(18,height*.16),opacity:.86}}><CogniMark size={markSize}/></View>
    <LinearGradient colors={["rgba(6,13,31,.04)","rgba(7,16,34,.78)"]} locations={[.25,1]} style={{position:"absolute",inset:0}}/>
  </View>;
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
  const bg=kind==="growth"?["rgba(20,184,166,.30)","rgba(18,57,58,.80)"]:kind==="decisions"?["rgba(245,158,11,.26)","rgba(57,41,70,.82)"]:["rgba(59,130,246,.28)","rgba(21,41,76,.86)"];
  return <View {...decorative} style={{width:size,height:size,borderRadius:radius.md,overflow:"hidden",backgroundColor:colors.panel2,alignItems:"center",justifyContent:"center"}}>
    <LinearGradient colors={bg as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={{position:"absolute",inset:0}}/>
    <SkillMotif kind={kind} size={size*.68}/>
    <LinearGradient colors={["rgba(255,255,255,.06)","transparent"]} style={{position:"absolute",inset:0}}/>
  </View>;
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
