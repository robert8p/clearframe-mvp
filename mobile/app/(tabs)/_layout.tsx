import React,{useEffect,useRef}from"react";
import{Redirect,Tabs}from"expo-router";
import{Animated,View,useWindowDimensions}from"react-native";
import{useSafeAreaInsets}from"react-native-safe-area-context";
import{CogniLogo}from"@/components/brand";
import{CogniIcon,type CogniIconName}from"@/components/visuals";
import{LoadingState}from"@/components/ui";
import{useReducedMotion}from"@/lib/accessibility";
import{useAuth}from"@/lib/auth";
import{colors,typography}from"@/lib/theme";

type TabGlyphName=Extract<CogniIconName,"home"|"skills"|"train"|"progress"|"profile">;
function TabIcon({name,active}:{name:TabGlyphName;active:boolean}){const reduced=useReducedMotion();const scale=useRef(new Animated.Value(1)).current;useEffect(()=>{if(!active||reduced){scale.stopAnimation();scale.setValue(1);return;}Animated.sequence([Animated.spring(scale,{toValue:1.06,damping:16,stiffness:250,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:18,stiffness:230,useNativeDriver:true})]).start();},[active,reduced,scale]);return<Animated.View accessible={false} style={{width:42,height:30,alignItems:"center",justifyContent:"center",transform:[{scale}]}}>{active?<View style={{position:"absolute",width:38,height:28,borderRadius:14,backgroundColor:"rgba(67,119,187,.22)"}}/>:null}<CogniIcon name={name} size={20} color={active?colors.cyan:colors.soft}/></Animated.View>;}
export default function TabLayout(){const{session,loading}=useAuth();const insets=useSafeAreaInsets();const{fontScale}=useWindowDimensions();if(loading)return<LoadingState/>;if(!session)return<Redirect href="/login"/>;const bottom=Math.max(insets.bottom,8);return<Tabs screenOptions={{headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.text,headerShadowVisible:false,headerTitleAlign:"left",headerTitle:()=> <CogniLogo compact animated={false}/>,sceneStyle:{backgroundColor:colors.bg},tabBarActiveTintColor:colors.cyan,tabBarInactiveTintColor:colors.soft,tabBarHideOnKeyboard: true,tabBarAllowFontScaling:false,tabBarItemStyle: { flex: 1,paddingTop:4},tabBarStyle:{backgroundColor:"rgba(7,18,37,.98)",borderTopColor:colors.line,height:64+bottom+(fontScale>1?5:0),paddingTop:5,paddingBottom:bottom},tabBarLabelStyle:{fontSize:11*Math.min(fontScale,1.2),lineHeight:14*Math.min(fontScale,1.2),...typography.label,paddingTop:1}}}>
<Tabs.Screen name="home" options={{title:"Home",headerShown:false,tabBarAccessibilityLabel:"Home tab",tabBarIcon:({focused})=><TabIcon name="home" active={focused}/>}}/>
<Tabs.Screen name="skills" options={{title:"Skills",tabBarAccessibilityLabel:"Skills tab",tabBarIcon:({focused})=><TabIcon name="skills" active={focused}/>}}/>
<Tabs.Screen name="train" options={{title:"Train",tabBarAccessibilityLabel: "Train tab",headerShown:false,tabBarIcon:({focused})=><TabIcon name="train" active={focused} />}}/>
<Tabs.Screen name="progress" options={{title:"Progress",tabBarAccessibilityLabel:"Progress tab",tabBarIcon:({focused})=><TabIcon name="progress" active={focused}/>}}/>
<Tabs.Screen name="profile" options={{title:"Profile",tabBarAccessibilityLabel:"Profile tab",tabBarIcon:({focused})=><TabIcon name="profile" active={focused}/>}}/>
</Tabs>;}
