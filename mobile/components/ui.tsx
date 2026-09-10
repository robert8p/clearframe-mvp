import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions, type ScrollViewProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, gradients, glow, motion, radius, typography } from "@/lib/theme";

type ScreenProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle>; atmospheric?: boolean };

function AmbientBackdrop({ atmospheric = true }: { atmospheric?: boolean }) {
  return (
    <View pointerEvents="none" accessible={false} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <LinearGradient colors={[colors.bgDeep, colors.bg, "#09162C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} />
      {atmospheric ? <Image source={require("../assets/approved-dreamscape.png")} resizeMode="cover" fadeDuration={0} style={{ position: "absolute", top: -58, right: -86, width: 430, height: 430, opacity: .18 }} /> : null}
      <LinearGradient colors={[...gradients.ambient]} locations={[0, .38, .68, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 520 }} />
      <View style={{ position: "absolute", left: -120, top: 260, width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(37,99,235,.06)", boxShadow: glow.blue }} />
      <View style={{ position: "absolute", right: -130, top: 510, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(139,92,246,.045)", boxShadow: glow.violet }} />
      {[{l:"12%",t:86,s:2},{l:"28%",t:164,s:1.5},{l:"78%",t:116,s:2},{l:"90%",t:286,s:1.5},{l:"63%",t:356,s:1.5}].map((dot,index)=><View key={index} style={{position:"absolute",left:dot.l as `${number}%`,top:dot.t,width:dot.s,height:dot.s,borderRadius:2,backgroundColor:"rgba(248,250,252,.42)"}}/>)}
    </View>
  );
}

export const Screen = React.forwardRef<ScrollView, ScreenProps>(function Screen({ children, refreshing, onRefresh, contentStyle, style, atmospheric = true, ...props }, ref) {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
        contentContainerStyle={[{ width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: width < 360 ? 16 : 20, paddingTop: 14, paddingBottom: Math.max(insets.bottom + 28, 36), gap: 22 }, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.cyan} /> : undefined}
        {...props}
      >{children}</ScrollView>
    </View>
  );
});

export function Card({ children, style, variant = "quiet" }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; variant?: "quiet" | "glass" | "solid" }) {
  const base: ViewStyle = {
    position: "relative", borderRadius: radius.lg, borderCurve: "continuous", padding: 18, gap: 12, overflow: "hidden",
    borderWidth: variant === "solid" ? 0 : 1,
    borderColor: variant === "glass" ? "rgba(111,168,255,.50)" : colors.line,
    backgroundColor: variant === "solid" ? colors.panel : variant === "glass" ? "rgba(18,33,61,.88)" : "rgba(15,23,42,.90)",
    boxShadow: variant === "glass" ? glow.blue : "0 10px 26px rgba(0,0,0,.18)",
  };
  return <View style={[base, style]}><LinearGradient pointerEvents="none" accessible={false} colors={variant === "glass" ? ["rgba(59,130,246,.09)", "rgba(139,92,246,.05)", "transparent"] : ["rgba(255,255,255,.026)", "transparent"]} style={{ position: "absolute", inset: 0 }} />{children}</View>;
}

export function EditorialPanel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <LinearGradient colors={[...gradients.panelQuiet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 12, overflow: "hidden" }, style]}>{children}</LinearGradient>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[{ color: colors.cyan, fontSize: 11.5, lineHeight: 18, textTransform: "uppercase", ...typography.eyebrow }, style]}>{children}</Text>;
}

export function Title({ children, size = 32, style }: { children: React.ReactNode; size?: number; style?: TextStyle }) {
  return <Text accessibilityRole="header" selectable style={[{ color: colors.text, fontSize: size, lineHeight: Math.round(size * 1.16), ...typography.title }, size >= 36 ? typography.display : null, style]}>{children}</Text>;
}

export function Body({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: TextStyle }) {
  return <Text selectable style={[{ color: muted ? colors.muted : colors.text, fontSize: 16.5, lineHeight: 25, ...typography.body }, style]}>{children}</Text>;
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}><Text accessibilityRole="header" style={{ flex: 1, color: colors.text, fontSize: 20, lineHeight: 27, ...typography.heading }}>{title}</Text>{action}</View>;
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <View style={{ alignSelf: "flex-start", paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: accent ? "rgba(34,211,238,.48)" : colors.line, backgroundColor: accent ? "rgba(34,211,238,.10)" : "rgba(18,33,61,.76)" }}><Text style={{ color: accent ? colors.cyan : colors.muted, fontSize: 12.5, lineHeight: 17, ...typography.label }}>{children}</Text></View>;
}

export function PrimaryButton({ label, onPress, disabled = false, secondary = false, loading = false, accessibilityHint, trailingArrow = false, testID }: {
  label: string; onPress: () => void; disabled?: boolean; secondary?: boolean; loading?: boolean; accessibilityHint?: string; trailingArrow?: boolean; testID?: string;
}) {
  const reducedMotion = useReducedMotion(); const scale = useRef(new Animated.Value(1)).current; const [focused, setFocused] = useState(false); const blocked = disabled || loading;
  useEffect(() => { if (reducedMotion || blocked) { scale.stopAnimation(); scale.setValue(1); } return () => scale.stopAnimation(); }, [blocked, reducedMotion, scale]);
  const animate = (value: number) => { if (reducedMotion || blocked) { scale.setValue(1); return; } Animated.spring(scale, { toValue: value, damping: 22, stiffness: 300, useNativeDriver: true }).start(); };
  const content = <View pointerEvents="none" style={{ minHeight: 56, paddingHorizontal: 20, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>{loading ? <ActivityIndicator accessible={false} color={colors.white} size="small" /> : null}<Text style={{ flexShrink: 1, textAlign: "center", color: colors.white, fontSize: 15.5, lineHeight: 22, ...typography.label }}>{label}</Text>{trailingArrow && !loading ? <View accessible={false} style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}><View style={{ width: 8, height: 8, borderTopWidth: 1.8, borderRightWidth: 1.8, borderColor: colors.white, transform: [{ rotate: "45deg" }], marginLeft: -3 }} /></View> : null}</View>;
  return <Animated.View style={{ transform: [{ scale }], borderRadius: radius.pill, borderWidth: focused ? 2 : 0, borderColor: colors.white, padding: focused ? 1 : 3, boxShadow: secondary || blocked ? undefined : glow.blue }}><Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: blocked, busy: loading }} disabled={blocked} onPress={onPress} onPressIn={() => animate(.985)} onPressOut={() => animate(1)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={({ pressed }) => ({ opacity: disabled && !loading ? .45 : pressed ? .9 : 1, minHeight: 56, borderRadius: radius.pill, overflow: "hidden", borderWidth: secondary ? 1 : 0, borderColor: secondary ? colors.lineStrong : "transparent", backgroundColor: secondary ? "rgba(18,33,61,.88)" : undefined })}>{secondary ? content : <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>{content}</LinearGradient>}</Pressable></Animated.View>;
}

/** Signature daily action. Warm light is deliberately limited to the trailing edge
 * so the control remains premium rather than looking like a generic neon CTA. */
export function TrainButton({ label = "Train", onPress, disabled = false, loading = false, accessibilityHint, testID }: { label?: string; onPress: () => void; disabled?: boolean; loading?: boolean; accessibilityHint?: string; testID?: string }) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const blocked = disabled || loading;
  useEffect(() => {
    if (reducedMotion || blocked) { breathe.stopAnimation(); breathe.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1800, useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [blocked, breathe, reducedMotion]);
  const glowOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [.45, .82] });
  const press = (value: number) => { if (reducedMotion || blocked) return; Animated.spring(scale, { toValue: value, damping: 20, stiffness: 320, useNativeDriver: true }).start(); };
  return (
    <Animated.View style={{ transform: [{ scale }], borderRadius: radius.pill, boxShadow: blocked ? undefined : "0 14px 44px rgba(37,99,235,.40)" }}>
      {!blocked ? <Animated.View pointerEvents="none" style={{ position: "absolute", inset: -4, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(34,211,238,.62)", opacity: glowOpacity }} /> : null}
      <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint} accessibilityState={{ disabled: blocked, busy: loading }} disabled={blocked} onPress={onPress} onPressIn={() => press(.965)} onPressOut={() => press(1)} style={({ pressed }) => ({ minHeight: 68, borderRadius: radius.pill, overflow: "hidden", opacity: disabled && !loading ? .48 : pressed ? .92 : 1 })}>
        <LinearGradient colors={[...gradients.train]} locations={[0, .34, .72, 1]} start={{ x: 0, y: .5 }} end={{ x: 1, y: .5 }} style={{ minHeight: 68, paddingHorizontal: 22, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 13, borderWidth: 1, borderColor: "rgba(255,255,255,.22)", borderRadius: radius.pill }}>
          <CogniMark size={32} animated={!blocked} />
          {loading ? <ActivityIndicator accessible={false} color={colors.white} size="small" /> : <Text style={{ color: colors.white, fontSize: 19, lineHeight: 25, ...typography.heading }}>{label}</Text>}
          {!loading ? <View accessible={false} style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}><View style={{ width: 9, height: 9, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.white, transform: [{ rotate: "45deg" }], marginLeft: -4 }} /></View> : null}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export function ActionLink({ label, onPress, hint }: { label: string; onPress: () => void; hint?: string }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint={hint} hitSlop={4} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, paddingHorizontal: 6, alignItems: "center", justifyContent: "center", opacity: pressed ? .7 : 1 })}><Text style={{ color: colors.cyan, fontSize: 14, lineHeight: 20, ...typography.label }}>{label}</Text></Pressable>;
}

export function ProgressBar({ value }: { value: number }) {
  const reducedMotion = useReducedMotion(); const percent = Number.isFinite(value) ? Math.max(0, Math.min(100, Number(value))) : 0; const animated = useRef(new Animated.Value(reducedMotion ? percent : 0)).current;
  useEffect(() => { if (reducedMotion) { animated.stopAnimation(); animated.setValue(percent); return; } const run = Animated.timing(animated, { toValue: percent, duration: motion.celebration, useNativeDriver: false }); run.start(); return () => run.stop(); }, [animated, percent, reducedMotion]);
  const width = animated.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent), text: `${Math.round(percent)} percent` }} style={{ height: 8, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(71,85,105,.42)", borderWidth: 1, borderColor: "rgba(148,163,184,.16)" }}><Animated.View style={{ width, height: "100%" }}><LinearGradient colors={[...gradients.progress]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 999 }} /></Animated.View></View>;
}

export function ProgressRing({ value, label }: { value: number | null; label?: string }) {
  const { fontScale } = useWindowDimensions(); const hasValue = value !== null && Number.isFinite(value); const percent = hasValue ? Math.max(0, Math.min(100, Number(value))) : 0;
  if (!hasValue || fontScale > 1.25) return <View accessible accessibilityLabel={hasValue ? `${Math.round(percent)} percent ${label ?? "score"}` : "No score yet"} style={{ alignItems: "center", justifyContent: "center", minWidth: 94, padding: 12, gap: 2 }}><Text style={{ color: colors.text, fontSize: 34, lineHeight: 40, ...typography.metric }}>{hasValue ? `${Math.round(percent)}%` : "—"}</Text><Text style={{ color: colors.muted, fontSize: 12.5, ...typography.body }}>{hasValue ? label : "No score yet"}</Text></View>;
  const segments = 72, radiusPx = 54, center = 65; const stops = [[34, 211, 238], [59, 130, 246], [139, 92, 246]];
  return <View accessibilityRole="progressbar" accessibilityLabel={label ?? "Recent score"} accessibilityValue={{ min: 0, max: 100, now: Math.round(percent), text: `${Math.round(percent)} percent` }} style={{ width: 130, height: 130, borderRadius: 65, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,16,38,.66)", boxShadow: glow.blue }}><View accessible={false} style={{ position: "absolute", inset: 7, borderRadius: 60, borderWidth: 8, borderColor: "rgba(71,85,105,.42)" }} />{Array.from({ length: Math.round(percent / 100 * segments) }, (_, i) => { const angle = -Math.PI / 2 + i / segments * Math.PI * 2, t = i / (segments - 1) * 2, low = Math.min(1, Math.floor(t)); const rgb = stops[low].map((v, c) => Math.round(v + (stops[low + 1][c] - v) * (t - low))); return <View key={i} accessible={false} style={{ position: "absolute", left: center + Math.cos(angle) * radiusPx - 4, top: center + Math.sin(angle) * radiusPx - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: `rgb(${rgb.join(",")})` }} />; })}<Text style={{ color: colors.text, fontSize: 30, lineHeight: 35, ...typography.metric, fontVariant: ["tabular-nums"] }}>{Math.round(percent)}%</Text>{label ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, ...typography.body }}>{label}</Text> : null}</View>;
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <View accessible accessibilityLabel={`${label}: ${value}${hint ? `. ${hint}` : ""}`} style={{ flex: 1, minWidth: 0, paddingVertical: 5, gap: 3 }}><Text style={{ color: colors.soft, fontSize: 11.5, lineHeight: 17, textTransform: "uppercase", ...typography.eyebrow }}>{label}</Text><Text style={{ color: colors.text, fontSize: 27, lineHeight: 33, ...typography.metric, fontVariant: ["tabular-nums"] }}>{value}</Text>{hint ? <Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18, ...typography.body }}>{hint}</Text> : null}</View>;
}

export function LoadingState({ label = "Connecting your knowledge…" }: { label?: string }) {
  const reducedMotion = useReducedMotion();
  return <View accessibilityLiveRegion="polite" style={{ flex: 1, backgroundColor: colors.bgDeep, justifyContent: "center", alignItems: "center", gap: 16, padding: 28 }}><View style={{ padding: 18, borderRadius: 80, backgroundColor: "rgba(37,99,235,.08)", boxShadow: glow.blue }}><CogniMark size={64} animated={!reducedMotion} /></View><ActivityIndicator accessibilityLabel="Loading" color={colors.cyan} size="small" /><Text style={{ color: colors.muted, fontSize: 15.5, ...typography.bodyMedium, textAlign: "center" }}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}><EditorialPanel style={{ borderColor: "rgba(239,68,68,.34)" }}><View style={{ alignSelf: "flex-start", width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,.12)", borderWidth: 1, borderColor: "rgba(239,68,68,.46)" }}><Text accessible={false} style={{ color: colors.danger, fontSize: 24, ...typography.heading }}>!</Text></View><Eyebrow style={{ color: colors.pink }}>Something went wrong</Eyebrow><Title size={25}>We couldn’t load this.</Title><Text accessibilityLiveRegion="assertive" selectable style={{ color: colors.muted, fontSize: 16, lineHeight: 24, ...typography.body }}>{message}</Text>{onRetry ? <PrimaryButton label="Try again" onPress={onRetry} /> : null}</EditorialPanel></Screen>;
}

export function SkillBar({ label, score, reliability }: { label: string; score: number; reliability: number }) {
  const evidence = reliability >= .7 ? "More evidence" : reliability >= .35 ? "Building evidence" : "Early evidence";
  return <View accessible accessibilityLabel={`${label}. Score ${Math.round(score)} out of 100. ${evidence}.`} style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 22, ...typography.bodyMedium }}>{label}</Text><Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18, ...typography.body }}>{evidence}</Text></View><Text style={{ color: colors.cyan, fontSize: 17, lineHeight: 22, ...typography.metric, fontVariant: ["tabular-nums"] }}>{Math.round(score)}</Text></View><ProgressBar value={score} /></View>;
}

export const fieldStyle = { minHeight: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: "rgba(15,23,42,.92)", color: colors.text, paddingHorizontal: 14, fontSize: 16.5, ...typography.body } as const;
