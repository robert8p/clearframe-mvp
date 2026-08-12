import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, Text, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, glow } from "@/lib/theme";

type ScreenProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle> };

function AmbientBackground() {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 5200, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 5200, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [drift]);
  const translate = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 18] });
  const opacity = drift.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.42] });
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, overflow: "hidden" }}>
      <Animated.View style={{ position: "absolute", width: 230, height: 230, borderRadius: 115, right: -120, top: 70, backgroundColor: "rgba(107,92,255,0.18)", opacity, transform: [{ translateY: translate }], boxShadow: glow.violet }} />
      <Animated.View style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, left: -120, top: 410, backgroundColor: "rgba(0,229,255,0.10)", opacity, transform: [{ translateY: Animated.multiply(translate, -0.7) }], boxShadow: glow.cyan }} />
      <Text style={{ position: "absolute", top: 112, left: 28, color: "rgba(0,229,255,0.34)", fontSize: 10 }}>✦</Text>
      <Text style={{ position: "absolute", top: 252, right: 42, color: "rgba(255,79,216,0.28)", fontSize: 8 }}>✦</Text>
      <Text style={{ position: "absolute", top: 620, left: 54, color: "rgba(107,92,255,0.34)", fontSize: 9 }}>•</Text>
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
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(enter, { toValue: 1, damping: 17, stiffness: 115, useNativeDriver: true }).start(); }, [enter]);
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  return (
    <Animated.View style={[{ position: "relative", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, borderRadius: 24, borderCurve: "continuous", padding: 18, gap: 11, overflow: "hidden", boxShadow: "0 10px 34px rgba(0,0,0,0.18)", opacity: enter, transform: [{ translateY }] }, style]}>
      <LinearGradient pointerEvents="none" colors={["rgba(48,61,130,0.22)", "rgba(14,20,48,0.05)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }} />
      {children}
    </Animated.View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.cyan, fontSize: 12, lineHeight: 17, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" }}>{children}</Text>;
}

export function Title({ children, size = 32 }: { children: React.ReactNode; size?: number }) {
  return <Text selectable style={{ color: colors.text, fontSize: size, lineHeight: Math.round(size * 1.1), fontWeight: "800", letterSpacing: -0.9 }}>{children}</Text>;
}

export function Body({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text selectable style={[{ color: muted ? colors.muted : colors.text, fontSize: 16.5, lineHeight: 25 }, style]}>{children}</Text>;
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  if (accent) return <LinearGradient colors={["rgba(0,229,255,.13)", "rgba(107,92,255,.23)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "rgba(107,92,255,.62)" }}><Text style={{ color: "#e6ebff", fontSize: 13, fontWeight: "800" }}>{children}</Text></LinearGradient>;
  return <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(21,30,63,.9)" }}><Text style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>{children}</Text></View>;
}

export function PrimaryButton({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.975, damping: 18, stiffness: 260, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 220, useNativeDriver: true }).start();
  return (
    <Animated.View style={{ transform: [{ scale }], boxShadow: secondary ? undefined : "0 8px 26px rgba(107,92,255,0.22)" }}>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={({ pressed }) => ({ opacity: disabled ? 0.44 : pressed ? 0.9 : 1, minHeight: 54, borderRadius: 17, overflow: "hidden", borderCurve: "continuous", borderWidth: secondary ? 1 : 0, borderColor: colors.lineStrong })}>
        {secondary ? <View style={{ minHeight: 54, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(17,24,55,.94)", paddingHorizontal: 17 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{label}</Text></View> : <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ minHeight: 54, justifyContent: "center", alignItems: "center", paddingHorizontal: 17 }}><View pointerEvents="none" style={{ position: "absolute", top: -30, left: "34%", width: 64, height: 115, transform: [{ rotate: "28deg" }], backgroundColor: "rgba(255,255,255,.10)" }} /><Text style={{ color: colors.white, fontSize: 16, fontWeight: "900", letterSpacing: 0.1 }}>{label}</Text></LinearGradient>}
      </Pressable>
    </Animated.View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, value));
  const animated = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(animated, { toValue: percent, duration: 650, useNativeDriver: false }).start(); }, [animated, percent]);
  const width = animated.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
  return <View accessibilityLabel={`${Math.round(percent)} percent complete`} style={{ height: 7, borderRadius: 999, overflow: "hidden", backgroundColor: "#1d2850" }}><Animated.View style={{ width, height: "100%" }}><LinearGradient colors={[colors.cyan, colors.violet, colors.magenta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 999 }} /></Animated.View></View>;
}

export function ProgressRing({ value, label }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, value));
  const scale = useRef(new Animated.Value(0.88)).current;
  useEffect(() => { Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 120, useNativeDriver: true }).start(); }, [scale]);
  return <Animated.View style={{ width: 92, height: 92, borderRadius: 46, transform: [{ scale }], boxShadow: glow.cyan }}><LinearGradient colors={[colors.cyan, colors.violet, colors.magenta]} style={{ flex: 1, borderRadius: 46, padding: 6 }}><View style={{ flex: 1, borderRadius: 40, backgroundColor: colors.bg2, alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.text, fontSize: 23, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(percent)}%</Text>{label ? <Text style={{ color: colors.soft, fontSize: 10, fontWeight: "800" }}>{label}</Text> : null}</View></LinearGradient></Animated.View>;
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card style={{ flex: 1, minWidth: 0 }}><Eyebrow>{label}</Eyebrow><Text style={{ color: colors.text, fontSize: 28, lineHeight: 32, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{value}</Text>{hint ? <Text style={{ color: colors.soft, fontSize: 12, lineHeight: 17 }}>{hint}</Text> : null}</Card>;
}

export function LoadingState({ label = "Loading Cogni…" }: { label?: string }) {
  return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", gap: 14, padding: 28 }}><View style={{ padding: 14, borderRadius: 30, backgroundColor: "rgba(107,92,255,.12)", boxShadow: glow.violet }}><ActivityIndicator color={colors.cyan} size="large" /></View><Text style={{ color: colors.muted, fontSize: 16, fontWeight: "700" }}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}><Card><Eyebrow>Something went wrong</Eyebrow><Title size={25}>We couldn’t load this.</Title><Body muted>{message}</Body>{onRetry ? <PrimaryButton label="Try again" onPress={onRetry} /> : null}</Card></Screen>;
}

export function SkillBar({ label, score, reliability }: { label: string; score: number; reliability: number }) {
  const evidence = reliability >= 0.7 ? "Strong evidence" : reliability >= 0.35 ? "Building evidence" : "Early evidence";
  return <View style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 21, fontWeight: "800" }}>{label}</Text><Text style={{ color: colors.muted, fontSize: 12.5 }}>{evidence}</Text></View><Text style={{ color: colors.cyan, fontSize: 17, fontWeight: "900", fontVariant: ["tabular-nums"] }}>{Math.round(score)}</Text></View><ProgressBar value={score} /></View>;
}

export const fieldStyle = { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(20,29,63,.94)", color: colors.text, paddingHorizontal: 14, fontSize: 16 } as const;
