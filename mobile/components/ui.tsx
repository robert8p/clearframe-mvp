import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, gradients, glow } from "@/lib/theme";

type ScreenProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle> };

function AmbientBackground() {
  return <LinearGradient pointerEvents="none" accessible={false} colors={["rgba(120,104,239,.08)", "transparent"]} style={{ position:"absolute",top:0,right:0,left:0,height:280 }} />;
}

export const Screen = React.forwardRef<ScrollView, ScreenProps>(function Screen({ children, refreshing, onRefresh, contentStyle, style, ...props }, ref) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AmbientBackground />
      <ScrollView
        ref={ref}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        style={[{ flex: 1 }, style]}
        contentContainerStyle={[{ width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: width < 360 ? 16 : 20, paddingTop: 14, paddingBottom: Math.max(insets.bottom + 24, 32), gap: 20 }, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.cyan} /> : undefined}
        {...props}
      >
        {children}
      </ScrollView>
    </View>
  );
});

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  // Learning content must be readable before any animation runs. In particular,
  // Android with animations disabled must never strand a question at opacity 0.
  return (
    <View style={[{ position: "relative", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, borderRadius: 20, borderCurve: "continuous", padding: 18, gap: 11, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }, style]}>
      {children}
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.cyan, fontSize: 12.5, lineHeight: 18, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" }}>{children}</Text>;
}

export function Title({ children, size = 32 }: { children: React.ReactNode; size?: number }) {
  return <Text accessibilityRole="header" selectable style={{ color: colors.text, fontSize: size, lineHeight: Math.round(size * 1.22), fontWeight: "800", letterSpacing: -0.6 }}>{children}</Text>;
}

export function Body({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text selectable style={[{ color: muted ? colors.muted : colors.text, fontSize: 16.5, lineHeight: 25 }, style]}>{children}</Text>;
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  if (accent) return <LinearGradient colors={["rgba(0,229,255,.13)", "rgba(107,92,255,.23)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(107,92,255,.62)" }}><Text style={{ color: "#e6ebff", fontSize: 13.5, fontWeight: "800" }}>{children}</Text></LinearGradient>;
  return <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(21,30,63,.9)" }}><Text style={{ color: colors.muted, fontSize: 13.5, fontWeight: "800" }}>{children}</Text></View>;
}

export function PrimaryButton({ label, onPress, disabled = false, secondary = false, loading = false, accessibilityHint, trailingArrow = false, testID }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean;
  loading?: boolean; accessibilityHint?: string; trailingArrow?: boolean; testID?: string;
}) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [focused, setFocused] = useState(false);
  const blocked = disabled || loading;
  useEffect(() => {
    if (reducedMotion || blocked) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [blocked, reducedMotion, scale]);
  const animate = (value: number) => {
    if (reducedMotion || blocked) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue: value, damping: 20, stiffness: 280, useNativeDriver: true }).start();
  };
  const content = <View pointerEvents="none" style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 56, paddingHorizontal: 18, paddingVertical: 14 }}>
    {loading ? <ActivityIndicator accessible={false} color={colors.white} size="small" /> : null}
    <Text style={{ flexShrink: 1, textAlign: "center", color: secondary ? colors.text : colors.white, fontSize: 16, lineHeight: 23, fontWeight: "800" }}>{label}</Text>
    {trailingArrow && !loading ? <Text accessible={false} style={{ color: colors.white, fontSize: 21, lineHeight: 25, fontWeight: "700" }}>→</Text> : null}
  </View>;
  return <Animated.View style={{ transform: [{ scale }], borderRadius: 19, borderWidth: 2, borderColor: focused ? colors.cyan : "transparent", padding: 2, boxShadow: secondary ? undefined : "0 6px 18px rgba(80,69,187,0.16)" }}>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: blocked, busy: loading }} disabled={blocked} onPress={onPress} onPressIn={() => animate(0.985)} onPressOut={() => animate(1)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => ({ opacity: disabled && !loading ? 0.48 : pressed ? 0.90 : 1, minHeight: 56, borderRadius: 15, overflow: "hidden", borderCurve: "continuous", borderWidth: secondary ? 1 : 0, borderColor: colors.lineStrong })}>
      {secondary ? <View style={{ backgroundColor: "rgba(17,24,55,.94)" }}>{content}</View> : <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>{content}</LinearGradient>}
    </Pressable>
  </Animated.View>;
}

export function ActionLink({ label, onPress, hint }: { label: string; onPress: () => void; hint?: string }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint={hint} hitSlop={4} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 })}><Text style={{ color: colors.purple, fontSize: 14, fontWeight: "900" }}>{label}</Text></Pressable>;
}

export function ProgressBar({ value }: { value: number }) {
  const reducedMotion = useReducedMotion();
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, Number(value))) : 0;
  const animated = useRef(new Animated.Value(reducedMotion ? percent : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      animated.stopAnimation();
      animated.setValue(percent);
      return;
    }
    const animation = Animated.timing(animated, { toValue: percent, duration: 600, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [animated, percent, reducedMotion]);

  const width = animated.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent), text: `${Math.round(percent)} percent` }} style={{ height: 8, borderRadius: 999, overflow: "hidden", backgroundColor: "#1d2850" }}><Animated.View style={{ width, height: "100%" }}><LinearGradient colors={[colors.cyan, colors.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 999 }} /></Animated.View></View>;
}

export function ProgressRing({ value, label }: { value: number | null; label?: string }) {
  const reducedMotion = useReducedMotion();
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, Number(value))) : 0;
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  const { fontScale } = useWindowDimensions();
  const hasValue = value !== null && Number.isFinite(value);
  const segmentCount = 20;
  const activeCount = Math.round(percent / 100 * segmentCount);
  const center = 46;
  const radius = 39;

  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      return;
    }
    const animation = Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 115, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reducedMotion, scale]);

  if (!hasValue || fontScale > 1.25) return <View accessible accessibilityLabel={hasValue ? `${Math.round(percent)} percent ${label ?? "score"}` : "No score yet"} style={{ alignItems:"center",justifyContent:"center",minWidth:78,padding:12,gap:4 }}><Text style={{ color:colors.text,fontSize:26,fontWeight:"800" }}>{hasValue ? `${Math.round(percent)}%` : "—"}</Text><Text style={{ color:colors.muted,fontSize:13 }}>{hasValue ? label : "No score yet"}</Text></View>;
  return (
    <Animated.View accessibilityRole="progressbar" accessibilityLabel={label ? `${label} score` : "Score"} accessibilityValue={{ min: 0, max: 100, now: Math.round(percent), text: `${Math.round(percent)} percent` }} style={{ width: 92, height: 92, borderRadius: 46, transform: [{ scale }], backgroundColor: "rgba(11,16,35,.82)", borderWidth: 1, borderColor: colors.line, boxShadow: glow.cyan, alignItems: "center", justifyContent: "center" }}>
      {Array.from({ length: segmentCount }, (_, index) => {
        const angle = -Math.PI / 2 + index / segmentCount * Math.PI * 2;
        const left = center + Math.cos(angle) * radius - 3;
        const top = center + Math.sin(angle) * radius - 3;
        const active = index < activeCount;
        const activeColor = index < 7 ? colors.cyan : index < 14 ? colors.violet : colors.magenta;
        return <View key={index} accessible={false} style={{ position: "absolute", left, top, width: 6, height: 6, borderRadius: 3, backgroundColor: active ? activeColor : colors.line }} />;
      })}
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(percent)}%</Text>
      {label ? <Text style={{ color: colors.soft, fontSize: 11.5, lineHeight: 15, fontWeight: "800" }}>{label}</Text> : null}
    </Animated.View>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card style={{ flex: 1, minWidth: 0 }}><View accessible accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ""}`}><Eyebrow>{label}</Eyebrow><Text style={{ color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{value}</Text>{hint ? <Text style={{ color: colors.soft, fontSize: 12.5, lineHeight: 18 }}>{hint}</Text> : null}</View></Card>;
}

export function LoadingState({ label = "Loading Cogni…" }: { label?: string }) {
  const reducedMotion = useReducedMotion();
  return <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", gap: 14, padding: 28 }}><View accessible={false} style={{ padding: 16, borderRadius: 30, backgroundColor: "rgba(107,92,255,.12)", boxShadow: glow.violet }}><CogniMark size={44} animated={!reducedMotion} /></View><ActivityIndicator accessibilityLabel="Loading" color={colors.cyan} size="small" /><Text style={{ color: colors.muted, fontSize: 16, fontWeight: "700", textAlign: "center" }}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}><Card><Eyebrow>Something went wrong</Eyebrow><Title size={25}>We couldn’t load this.</Title><Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.muted, fontSize: 16.5, lineHeight: 25 }}>{message}</Text>{onRetry ? <PrimaryButton label="Try again" onPress={onRetry} /> : null}</Card></Screen>;
}

export function SkillBar({ label, score, reliability }: { label: string; score: number; reliability: number }) {
  const evidence = reliability >= 0.7 ? "More evidence" : reliability >= 0.35 ? "Building evidence" : "Early evidence";
  return <View accessible accessibilityLabel={`${label}. Score ${Math.round(score)} out of 100. ${evidence}.`} style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 22, fontWeight: "800" }}>{label}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{evidence}</Text></View><Text style={{ color: colors.cyan, fontSize: 17, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(score)}</Text></View><ProgressBar value={score} /></View>;
}

export const fieldStyle = { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: "rgba(20,29,63,.94)", color: colors.text, paddingHorizontal: 14, fontSize: 16.5 } as const;
