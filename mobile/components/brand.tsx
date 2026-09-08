import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, typography } from "@/lib/theme";

/** A quiet brand beacon used only where a compact mark is needed. */
export function CogniMark({ size = 34, animated = true }: {size?:number;animated?:boolean}) {
  const reduced=useReducedMotion();const pulse=useRef(new Animated.Value(0)).current;const motion=animated&&!reduced;
  useEffect(()=>{if(!motion){pulse.stopAnimation();pulse.setValue(0);return;}const loop=Animated.loop(Animated.sequence([Animated.timing(pulse,{toValue:1,duration:1900,useNativeDriver:true}),Animated.timing(pulse,{toValue:0,duration:1900,useNativeDriver:true})]));loop.start();return()=>loop.stop();},[motion,pulse]);
  const scale=pulse.interpolate({inputRange:[0,1],outputRange:[1,1.045]});const opacity=pulse.interpolate({inputRange:[0,1],outputRange:[.24,.42]});
  return <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={{width:size,height:size,alignItems:"center",justifyContent:"center",transform:[{scale}]}}><Animated.View style={{position:"absolute",width:size,height:size,borderRadius:size/2,backgroundColor:"rgba(102,127,255,.22)",opacity}}/><LinearGradient colors={[colors.cyan,colors.blue,colors.violet]} start={{x:0,y:0}} end={{x:1,y:1}} style={{width:size*.68,height:size*.68,borderRadius:size*.34,alignItems:"center",justifyContent:"center"}}><View style={{width:size*.28,height:size*.28,borderRadius:size*.14,backgroundColor:colors.bg}}/></LinearGradient></Animated.View>;
}

export function CogniLogo({ compact=false, centered=false, animated=false }: {compact?:boolean;centered?:boolean;animated?:boolean}) {
  const fontSize=compact?24:40;
  return <View accessibilityLabel="Cogni" accessible style={{flexDirection:"row",alignItems:"center",justifyContent:centered?"center":"flex-start"}}>
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{position:"relative",paddingRight:compact?2:3}}>
      <Text allowFontScaling={false} style={{color:colors.text,fontSize,lineHeight:fontSize*1.06,...typography.display}}>Cogni</Text>
      <LinearGradient colors={[colors.cyan,colors.violet]} style={{position:"absolute",right:compact?1:2,top:compact?-1:-2,width:compact?6:9,height:compact?6:9,borderRadius:9}}/>
    </View>
  </View>;
}
