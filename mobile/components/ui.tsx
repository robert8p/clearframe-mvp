import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, Text, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, gradients, glow } from "@/lib/theme";

type ScreenProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle> };

function AmbientBackground() {
  const reducedMotion = useReducedMotion();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      drift.stopAnimation();
      drift.setValue(0);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 6200, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 6200, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [drift, reducedMotion]);

  const translate = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const opacity = drift.interpolate({ inputRange: [0, 1], outputRange: [0.20, 0.34] });

  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden" }}>
      <Animated.View style={{ position: "absolute", width: 230, height: 230, borderRadius: 115, right: -120, top: 70, backgroundColor: "rgba(107,92,255,0.16)", opacity, transform: [{ translateY: translate }], boxShadow: glow.violet }} />
      <Animated.View style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, left: -120, top: 410, backgroundColor: "rgba(0,229,255,0.09)", opacity, transform: [{ translateY: Animated.multiply(translate, -0.7) }], boxShadow: glow.cyan }} />
      <Text accessible={false} style={{ position: "absolute", top: 112, left: 28, color: "rgba(0,229,255,0.30)", fontSize: 10 }}>✦</Text>
      <Text accessible={false} style={{ position: "absolute", top: 252, right: 42, color: "rgba(255,79,216,0.24)", fontSize: 8 }}>✦</Text>
      <Text accessible={false} style={{ position: "absolute", top: 620, left: 54, color: "rgba(107,92,255,0.30)", fontSize: 9 }}>•</Text>
    </View>
  );
}

export const Screen = React.forwardRef<ScrollView, ScreenProps>(function Screen({ children, refreshing, onRefresh, contentStyle, style, ...props }, ref) {
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
        contentContainerStyle={[{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 132, gap: 16 }, contentStyle]}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.cyan} /> : undefined}
        {...props}
      >
        {children}
      </ScrollView>
    </View>
  );
});

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const enter = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reducedMotion) {
      enter.stopAnimation();
      enter.setValue(1);
      return;
    }
    const animation = Animated.spring(enter, { toValue: 1, damping: 18, stiffness: 110, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [enter, reducedMotion]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return (
    <Animated.View style={[{ position: "relative", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, borderRadius: 24, borderCurve: "continuous", padding: 18, gap: 11, overflow: "hidden", boxShadow: "0 10px 34px rgba(0,0,0,0.18)", opacity: enter, transform: [{ translateY }] }, style]}>
      <LinearGradient pointerEvents="none" colors={["rgba(48,61,130,0.18)", "rgba(14,20,48,0.04)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      {children}
    </Animated.View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.cyan, fontSize: 12.5, lineHeight: 18, fontWeight: "900", letterSpacing: 1.0, textTransform: "uppercase" }}>{children}</Text>;
}

export function Title({ children, size = 32 }: { children: React.ReactNode; size?: number }) {
  return <Text accessibilityRole="header" selectable style={{ color: colors.text, fontSize: size, lineHeight: Math.round(size * 1.12), fontWeight: "800", letterSpacing: -0.8 }}>{children}</Text>;
}

export function Body({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text selectable style={[{ color: muted ? colors.muted : colors.text, fontSize: 16.5, lineHeight: 25 }, style]}>{children}</Text>;
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  if (accent) return <LinearGradient colors={["rgba(0,229,255,.13)", "rgba(107,92,255,.23)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(107,92,255,.62)" }}><Text style={{ color: "#e6ebff", fontSize: 13.5, fontWeight: "800" }}>{children}</Text></LinearGradient>;
  return <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(21,30,63,.9)" }}><Text style={{ color: colors.muted, fontSize: 13.5, fontWeight: "800" }}>{children}</Text></View>;
}

export function PrimaryButton({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => {
    if (!reducedMotion) Animated.spring(scale, { toValue: 0.975, damping: 18, stiffness: 260, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    if (reducedMotion) scale.setValue(1);
    else Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 220, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], boxShadow: secondary ? undefined : "0 8px 26px rgba(107,92,255,0.22)" }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={({ pressed }) => ({ opacity: disabled ? 0.48 : pressed ? 0.90 : 1, minHeight: 56, borderRadius: 17, overflow: "hidden", borderCurve: "continuous", borderWidth: secondary ? 1 : 0, borderColor: colors.lineStrong })}>
        {secondary ? <View style={{ minHeight: 56, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(17,24,55,.94)", paddingHorizontal: 18 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{label}</Text></View> : <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ minHeight: 56, justifyContent: "center", alignItems: "center", paddingHorizontal: 18 }}><View pointerEvents="none" style={{ position: "absolute", top: -30, left: "34%", width: 64, height: 115, transform: [{ rotate: "28deg" }], backgroundColor: "rgba(255,255,255,.08)" }} /><Text style={{ color: colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 0.1 }}>{label}</Text></LinearGradient>}
      </Pressable>
    </Animated.View>
  );
}

export function ActionLink({ label, onPress, hint }: { label: string; onPress: () => void; hint?: string }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={label} accessibilityHint={hint} hitSlop={4} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, minWidth: 48, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 })}><Text style={{ color: colors.purple, fontSize: 14, fontWeight: "900" }}>{label}</Text></Pressable>;
}

export function ProgressBar({ value }: { value: number }) {
  const reducedMotion = useReducedMotion();
  const percent = Math.max(0, Math.min(100, value));
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
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent), text: `${Math.round(percent)} percent` }} style={{ height: 8, borderRadius: 999, overflow: "hidden", backgroundColor: "#1d2850" }}><Animated.View style={{ width, height: "100%" }}><LinearGradient colors={[colors.cyan, colors.violet, colors.magenta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 999 }} /></Animated.View></View>;
}

export function ProgressRing({ value, label }: { value: number; label?: string }) {
  const reducedMotion = useReducedMotion();
  const percent = Math.max(0, Math.min(100, value));
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
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
  const evidence = reliability >= 0.7 ? "Strong evidence" : reliability >= 0.35 ? "Building evidence" : "Early evidence";
  return <View accessible accessibilityLabel={`${label}. Score ${Math.round(score)} out of 100. ${evidence}.`} style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 22, fontWeight: "800" }}>{label}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{evidence}</Text></View><Text style={{ color: colors.cyan, fontSize: 17, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(score)}</Text></View><ProgressBar value={score} /></View>;
}

export const fieldStyle = { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: "rgba(20,29,63,.94)", color: colors.text, paddingHorizontal: 14, fontSize: 16.5 } as const;
