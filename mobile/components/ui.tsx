import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions, type ScrollViewProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, gradients, glow, radius, typography } from "@/lib/theme";

type ScreenProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle>; atmospheric?: boolean };

function AmbientBackdrop({ atmospheric = true }: { atmospheric?: boolean }) {
  return <View pointerEvents="none" accessible={false} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
    {atmospheric ? <Image source={require("../assets/approved-dreamscape.png")} resizeMode="cover" fadeDuration={0} style={{ position: "absolute", top: -60, right: -70, width: 390, height: 390, opacity: .16 }} /> : null}
    <LinearGradient colors={[...gradients.ambient]} locations={[0,.48,1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 430 }} />
    <LinearGradient colors={["rgba(151,102,255,.075)", "transparent"]} start={{x:1,y:0}} end={{x:0,y:1}} style={{ position:"absolute", right:-100, top:120, width:280, height:360, transform:[{rotate:"18deg"}] }} />
  </View>;
}

export const Screen = React.forwardRef<ScrollView, ScreenProps>(function Screen({ children, refreshing, onRefresh, contentStyle, style, atmospheric = true, ...props }, ref) {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: colors.bg }}>
    <AmbientBackdrop atmospheric={atmospheric} />
    <ScrollView
      key={`text-scale-${fontScale}`}
      ref={ref}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ width:"100%", maxWidth:720, alignSelf:"center", paddingHorizontal:width<360?16:20, paddingTop:14, paddingBottom:Math.max(insets.bottom+26,34), gap:22 }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.cyan} /> : undefined}
      {...props}
    >{children}</ScrollView>
  </View>;
});

export function Card({ children, style, variant = "quiet" }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; variant?: "quiet"|"glass"|"solid" }) {
  const base: ViewStyle = {
    position:"relative", borderRadius:radius.lg, borderCurve:"continuous", padding:18, gap:12, overflow:"hidden",
    borderWidth: variant === "solid" ? 0 : 1,
    borderColor: variant === "glass" ? colors.lineStrong : colors.line,
    backgroundColor: variant === "solid" ? colors.panel : variant === "glass" ? "rgba(17,34,63,.80)" : "rgba(13,28,52,.90)",
  };
  return <View style={[base, style]}>{variant === "glass" ? <LinearGradient pointerEvents="none" accessible={false} colors={["rgba(255,255,255,.035)","transparent"]} style={{position:"absolute",inset:0}} /> : null}{children}</View>;
}

export function EditorialPanel({ children, style }: {children:React.ReactNode;style?:StyleProp<ViewStyle>}) {
  return <LinearGradient colors={[...gradients.panelQuiet]} start={{x:0,y:0}} end={{x:1,y:1}} style={[{borderRadius:radius.lg,borderWidth:1,borderColor:colors.line,padding:18,gap:12,overflow:"hidden"},style]}>{children}</LinearGradient>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[{ color:colors.cyan,fontSize:11.5,lineHeight:18,textTransform:"uppercase",...typography.eyebrow },style]}>{children}</Text>;
}

export function Title({ children, size = 32, style }: { children: React.ReactNode; size?: number; style?: TextStyle }) {
  return <Text accessibilityRole="header" selectable style={[{color:colors.text,fontSize:size,lineHeight:Math.round(size*1.16),...typography.title}, size>=36?typography.display:null, style]}>{children}</Text>;
}

export function Body({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: TextStyle }) {
  return <Text selectable style={[{ color:muted?colors.muted:colors.text,fontSize:16.5,lineHeight:25,...typography.body },style]}>{children}</Text>;
}

export function SectionHeader({ title, action }: {title:string;action?:React.ReactNode}) {
  return <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12}}><Text accessibilityRole="header" style={{flex:1,color:colors.text,fontSize:20,lineHeight:27,...typography.heading}}>{title}</Text>{action}</View>;
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <View style={{alignSelf:"flex-start",paddingHorizontal:11,paddingVertical:6,borderRadius:radius.pill,borderWidth:1,borderColor:accent?"rgba(109,235,255,.42)":colors.line,backgroundColor:accent?"rgba(53,150,196,.14)":"rgba(17,36,66,.72)"}}><Text style={{color:accent?colors.cyan:colors.muted,fontSize:12.5,lineHeight:17,...typography.label}}>{children}</Text></View>;
}

export function PrimaryButton({ label, onPress, disabled = false, secondary = false, loading = false, accessibilityHint, trailingArrow = false, testID }: {
  label:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;loading?:boolean;accessibilityHint?:string;trailingArrow?:boolean;testID?:string;
}) {
  const reducedMotion=useReducedMotion(); const scale=useRef(new Animated.Value(1)).current; const [focused,setFocused]=useState(false); const blocked=disabled||loading;
  useEffect(()=>{ if(reducedMotion||blocked){scale.stopAnimation();scale.setValue(1);} return()=>scale.stopAnimation(); },[blocked,reducedMotion,scale]);
  const animate=(v:number)=>{ if(reducedMotion||blocked){scale.setValue(1);return;} Animated.spring(scale,{toValue:v,damping:22,stiffness:300,useNativeDriver:true}).start(); };
  const content=<View pointerEvents="none" style={{minHeight:54,paddingHorizontal:20,paddingVertical:13,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10}}>{loading?<ActivityIndicator accessible={false} color={colors.white} size="small"/>:null}<Text style={{flexShrink:1,textAlign:"center",color:colors.white,fontSize:15.5,lineHeight:22,...typography.label}}>{label}</Text>{trailingArrow&&!loading?<View accessible={false} style={{width:18,height:18,alignItems:"center",justifyContent:"center"}}><View style={{width:8,height:8,borderTopWidth:1.8,borderRightWidth:1.8,borderColor:colors.white,transform:[{rotate:"45deg"}],marginLeft:-3}}/></View>:null}</View>;
  return <Animated.View style={{transform:[{scale}],borderRadius:radius.pill,borderWidth:focused?2:0,borderColor:colors.white,padding:focused?1:3,boxShadow:secondary||blocked?undefined:glow.cyan}}><Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint} accessibilityState={{disabled:blocked,busy:loading}} disabled={blocked} onPress={onPress} onPressIn={()=>animate(.985)} onPressOut={()=>animate(1)} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={({pressed})=>({opacity:disabled&&!loading?.45:pressed?.9:1,minHeight:54,borderRadius:radius.pill,overflow:"hidden",borderWidth:secondary?1:0,borderColor:colors.lineStrong,backgroundColor:secondary?"rgba(21,39,68,.82)":undefined})}>{secondary?content:<LinearGradient colors={[...gradients.primary]} start={{x:0,y:0}} end={{x:1,y:0}}>{content}</LinearGradient>}</Pressable></Animated.View>;
}

export function ActionLink({ label, onPress, hint }: { label:string;onPress:()=>void;hint?:string }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint={hint} hitSlop={4} onPress={onPress} style={({pressed})=>({minHeight:44,minWidth:44,paddingHorizontal:6,alignItems:"center",justifyContent:"center",opacity:pressed?.7:1})}><Text style={{color:colors.blue,fontSize:14,lineHeight:20,...typography.label}}>{label}</Text></Pressable>;
}

export function ProgressBar({ value }: { value:number }) {
  const reducedMotion=useReducedMotion();const percent=Number.isFinite(value)?Math.max(0,Math.min(100,Number(value))):0;const animated=useRef(new Animated.Value(reducedMotion?percent:0)).current;
  useEffect(()=>{if(reducedMotion){animated.stopAnimation();animated.setValue(percent);return;}const a=Animated.timing(animated,{toValue:percent,duration:560,useNativeDriver:false});a.start();return()=>a.stop();},[animated,percent,reducedMotion]);
  const width=animated.interpolate({inputRange:[0,100],outputRange:["0%","100%"]});
  return <View accessibilityRole="progressbar" accessibilityValue={{min:0,max:100,now:Math.round(percent),text:`${Math.round(percent)} percent`}} style={{height:7,borderRadius:999,overflow:"hidden",backgroundColor:"rgba(90,118,165,.22)"}}><Animated.View style={{width,height:"100%"}}><LinearGradient colors={[...gradients.progress]} start={{x:0,y:0}} end={{x:1,y:0}} style={{flex:1,borderRadius:999}}/></Animated.View></View>;
}

export function ProgressRing({ value, label }: {value:number|null;label?:string}) {
  const {fontScale}=useWindowDimensions();const hasValue=value!==null&&Number.isFinite(value);const percent=hasValue?Math.max(0,Math.min(100,Number(value))):0;
  if(!hasValue||fontScale>1.25)return <View accessible accessibilityLabel={hasValue?`${Math.round(percent)} percent ${label??"score"}`:"No score yet"} style={{alignItems:"center",justifyContent:"center",minWidth:94,padding:12,gap:2}}><Text style={{color:colors.text,fontSize:34,lineHeight:40,...typography.metric}}>{hasValue?`${Math.round(percent)}%`:"—"}</Text><Text style={{color:colors.muted,fontSize:12.5,...typography.body}}>{hasValue?label:"No score yet"}</Text></View>;
  const segments=72,radiusPx=54,center=65;const stops=[[102,238,255],[114,165,255],[166,125,255]];
  return <View accessibilityRole="progressbar" accessibilityLabel={label??"Recent score"} accessibilityValue={{min:0,max:100,now:Math.round(percent),text:`${Math.round(percent)} percent`}} style={{width:130,height:130,borderRadius:65,alignItems:"center",justifyContent:"center",backgroundColor:"rgba(8,20,42,.58)"}}><View accessible={false} style={{position:"absolute",inset:7,borderRadius:60,borderWidth:8,borderColor:"rgba(88,112,159,.24)"}}/>{Array.from({length:Math.round(percent/100*segments)},(_,i)=>{const angle=-Math.PI/2+i/segments*Math.PI*2,t=i/(segments-1)*2,low=Math.min(1,Math.floor(t));const rgb=stops[low].map((v,c)=>Math.round(v+(stops[low+1][c]-v)*(t-low)));return <View key={i} accessible={false} style={{position:"absolute",left:center+Math.cos(angle)*radiusPx-4,top:center+Math.sin(angle)*radiusPx-4,width:8,height:8,borderRadius:4,backgroundColor:`rgb(${rgb.join(",")})`}}/>;})}<Text style={{color:colors.text,fontSize:30,lineHeight:35,...typography.metric,fontVariant:["tabular-nums"]}}>{Math.round(percent)}%</Text>{label?<Text style={{color:colors.muted,fontSize:12,lineHeight:17,...typography.body}}>{label}</Text>:null}</View>;
}

export function MetricCard({label,value,hint}:{label:string;value:string|number;hint?:string}) {
  return <View accessible accessibilityLabel={`${label}: ${value}${hint?`. ${hint}`:""}`} style={{flex:1,minWidth:0,paddingVertical:5,gap:3}}><Text style={{color:colors.soft,fontSize:11.5,lineHeight:17,textTransform:"uppercase",...typography.eyebrow}}>{label}</Text><Text style={{color:colors.text,fontSize:27,lineHeight:33,...typography.metric,fontVariant:["tabular-nums"]}}>{value}</Text>{hint?<Text style={{color:colors.muted,fontSize:12.5,lineHeight:18,...typography.body}}>{hint}</Text>:null}</View>;
}

export function LoadingState({label="Loading Cogni…"}:{label?:string}) {const reducedMotion=useReducedMotion();return <View accessibilityLiveRegion="polite" style={{flex:1,backgroundColor:colors.bgDeep,justifyContent:"center",alignItems:"center",gap:14,padding:28}}><CogniMark size={42} animated={!reducedMotion}/><ActivityIndicator accessibilityLabel="Loading" color={colors.cyan} size="small"/><Text style={{color:colors.muted,fontSize:15.5,...typography.bodyMedium,textAlign:"center"}}>{label}</Text></View>;}
export function ErrorState({message,onRetry}:{message:string;onRetry?:()=>void}) {return <Screen contentStyle={{flexGrow:1,justifyContent:"center"}}><EditorialPanel><Eyebrow>Something went wrong</Eyebrow><Title size={25}>We couldn’t load this.</Title><Text accessibilityLiveRegion="assertive" selectable style={{color:colors.muted,fontSize:16,lineHeight:24,...typography.body}}>{message}</Text>{onRetry?<PrimaryButton label="Try again" onPress={onRetry}/>:null}</EditorialPanel></Screen>;}

export function SkillBar({label,score,reliability}:{label:string;score:number;reliability:number}) {const evidence=reliability>=.7?"More evidence":reliability>=.35?"Building evidence":"Early evidence";return <View accessible accessibilityLabel={`${label}. Score ${Math.round(score)} out of 100. ${evidence}.`} style={{gap:8}}><View style={{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:12}}><View style={{flex:1,gap:2}}><Text style={{color:colors.text,fontSize:15.5,lineHeight:22,...typography.bodyMedium}}>{label}</Text><Text style={{color:colors.muted,fontSize:12.5,lineHeight:18,...typography.body}}>{evidence}</Text></View><Text style={{color:colors.cyan,fontSize:17,lineHeight:22,...typography.metric,fontVariant:["tabular-nums"]}}>{Math.round(score)}</Text></View><ProgressBar value={score}/></View>;}

export const fieldStyle={minHeight:54,borderRadius:radius.md,borderWidth:1,borderColor:colors.lineStrong,backgroundColor:"rgba(11,27,50,.90)",color:colors.text,paddingHorizontal:14,fontSize:16.5,...typography.body} as const;
