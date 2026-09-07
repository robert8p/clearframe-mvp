import React, { useState } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/lib/theme";

// Decorative layers never join the accessibility tree or intercept a gesture.
const decorative = { accessible: false, importantForAccessibility: "no-hide-descendants" as const, pointerEvents: "none" as const };
const stars = [[.08,.12],[.18,.26],[.29,.1],[.36,.38],[.48,.13],[.56,.28],[.64,.1],[.78,.2],[.91,.09],[.94,.36],[.14,.44],[.7,.39],[.4,.06],[.84,.46]];
function Triangle({ x, y, w, h, fill }: {x:number;y:number;w:number;h:number;fill:string}) {
  return <View style={{position:"absolute",left:x,top:y,width:0,height:0,borderLeftWidth:w/2,borderRightWidth:w/2,borderBottomWidth:h,borderLeftColor:"transparent",borderRightColor:"transparent",borderBottomColor:fill}} />;
}
/** Crisp native illustration. No network, canvas, video, autoplay or new native library. */
export function MountainScene({ height = 182 }: { height?: number }) {
  const [width,setWidth]=useState(360);
  const horizon=height*.78;
  return <View {...decorative} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{height,width:"100%",overflow:"hidden",backgroundColor:"#1b2858"}}>
    <LinearGradient colors={["#111d49","#4b4388","#c798b2","#527ea2"]} style={{position:"absolute",inset:0}} />
    <View style={{position:"absolute",right:width*.12,top:height*.15,width:48,height:48,borderRadius:24,backgroundColor:"#ccdfff",boxShadow:"0 0 32px rgba(159,202,255,.45)"}} />
    <View style={{position:"absolute",right:width*.12-6,top:height*.15-5,width:46,height:46,borderRadius:24,backgroundColor:"#414478"}} />
    {stars.map(([x,y],i)=><View key={i} style={{position:"absolute",left:width*x,top:height*y,width:i%3?1.5:2.5,height:i%3?1.5:2.5,borderRadius:2,backgroundColor:i%2?"#c7d6ff":"#f6e3ff"}} />)}
    {[[-.12,.51,.54,.34,"#635e9d"],[.23,.32,.52,.5,"#756ca9"],[.54,.46,.65,.4,"#8a729f"]].map(([x,y,w,h,fill],i)=><Triangle key={`far-${i}`} x={Number(x)*width} y={Number(y)*height} w={Number(w)*width} h={Number(h)*height} fill={String(fill)} />)}
    <Triangle x={width*.33} y={height*.32} w={width*.22} h={height*.24} fill="#c4badb" />
    <Triangle x={width*.02} y={height*.52} w={width*.59} h={height*.36} fill="#394c86" />
    <Triangle x={width*.34} y={height*.49} w={width*.56} h={height*.42} fill="#405785" />
    <Triangle x={width*.05} y={height*.64} w={width*.52} h={height*.3} fill="#203e66" />
    <LinearGradient colors={["#375a87","#102b4a"]} style={{position:"absolute",top:horizon,left:0,right:0,bottom:0}} />
    {[.08,.25,.38,.52,.72].map((x,i)=><View key={`water-${i}`} style={{position:"absolute",left:width*x,top:horizon+6+i*5,height:1,width:width*(.16+i*.018),backgroundColor:"rgba(143,211,255,.28)"}} />)}
    {[.01,.055,.095,.15,.81,.86,.9,.95,.99].map((x,i)=>{
      const treeH=height*(.21+(i%3)*.045), treeW=treeH*.48, y=horizon-treeH+9;
      return <View key={`pine-${i}`} style={{position:"absolute",left:width*x,top:y,width:treeW,height:treeH+12}}>
        <Triangle x={0} y={treeH*.34} w={treeW} h={treeH*.65} fill="#10293d" />
        <Triangle x={treeW*.12} y={treeH*.17} w={treeW*.76} h={treeH*.58} fill="#12304a" />
        <Triangle x={treeW*.25} y={0} w={treeW*.5} h={treeH*.5} fill="#15324a" />
        <View style={{position:"absolute",left:treeW*.46,top:treeH*.65,width:2,height:treeH*.45,backgroundColor:"#0d263c"}} />
      </View>;
    })}
    <LinearGradient colors={["transparent","#0e1a35"]} style={{position:"absolute",left:0,right:0,bottom:0,height:height*.35}} />
  </View>;
}
/** Precomposed PNG keeps the approved portrait and fades without overlapping native gradients. */
export function WelcomeArtwork() {
  return <View {...decorative} style={{position:"absolute",top:0,left:0,right:0,height:310,overflow:"hidden"}}>
    <Image source={require("../assets/approved-dreamscape.png")} resizeMode="cover" fadeDuration={0} style={{width:"100%",height:310}} />
  </View>;
}
export type MotifKind = "perspective" | "reasoning" | "decisions" | "growth";
export function SkillMotif({ kind = "reasoning", size = 50 }: {kind?:MotifKind;size?:number}) {
  const tint=kind==="growth"?colors.green:kind==="decisions"?colors.amber:kind==="perspective"?colors.cyan:colors.purple;
  const line:ViewStyle={position:"absolute",borderColor:tint,borderWidth:1.7};
  return <LinearGradient {...decorative} colors={kind==="growth"?["#234c50","#12293c"]:kind==="decisions"?["#4b3e58","#212646"]:["#30386c","#152641"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{width:size,height:size,borderRadius:size*.28,borderWidth:1,borderColor:"rgba(162,180,255,.3)",alignItems:"center",justifyContent:"center"}}>
    {kind==="perspective" ? <><View style={{...line,width:size*.52,height:size*.52,borderRadius:size*.26}} /><View style={{...line,width:size*.2,height:size*.2,borderRadius:size*.1,backgroundColor:tint}} /></> : kind==="growth" ? <><View style={{...line,width:size*.34,height:size*.52,borderTopLeftRadius:size*.32,borderBottomRightRadius:size*.32,transform:[{rotate:"30deg"}],backgroundColor:"rgba(120,231,189,.13)"}} /><View style={{width:1.7,height:size*.42,backgroundColor:tint,transform:[{rotate:"30deg"}]}} /></> : kind==="decisions" ? <><View style={{...line,width:size*.56,height:size*.56,borderRadius:size*.28}} /><View style={{width:0,height:0,borderLeftWidth:size*.075,borderRightWidth:size*.075,borderBottomWidth:size*.34,borderLeftColor:"transparent",borderRightColor:"transparent",borderBottomColor:tint,transform:[{rotate:"35deg"}]}} /></> : <><View style={{...line,left:size*.21,top:size*.25,width:size*.29,height:size*.46,borderRadius:size*.15}} /><View style={{...line,left:size*.5,top:size*.25,width:size*.29,height:size*.46,borderRadius:size*.15}} /><View style={{width:size*.28,height:1.5,backgroundColor:tint,transform:[{rotate:"-30deg"}]}} /></>}
  </LinearGradient>;
}
export function motifForSkill(name:string):MotifKind {
  const value=name.toLowerCase();
  return /decision|risk|judg/.test(value)?"decisions":/perspective|bias|evidence/.test(value)?"perspective":/growth|creative|adapt|reflect/.test(value)?"growth":"reasoning";
}
