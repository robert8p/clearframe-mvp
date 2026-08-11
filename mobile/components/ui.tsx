import React from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients } from "@/lib/theme";

type ScreenProps = ScrollViewProps & { refreshing?: boolean; onRefresh?: () => void; contentStyle?: ViewStyle };

export const Screen = React.forwardRef<ScrollView, ScreenProps>(function Screen({ children, refreshing, onRefresh, contentStyle, ...props }, ref) {
  return <ScrollView ref={ref} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[{ padding: 20, paddingBottom: 120, gap: 16 }, contentStyle]} refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.cyan} /> : undefined} {...props}>{children}</ScrollView>;
});

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, borderRadius: 22, borderCurve: "continuous", padding: 18, gap: 10 }, style]}>{children}</View>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.cyan, fontSize: 13, lineHeight: 18, fontWeight: "800", letterSpacing: 0.4 }}>{children}</Text>;
}

export function Title({ children, size = 32 }: { children: React.ReactNode; size?: number }) {
  return <Text selectable style={{ color: colors.text, fontSize: size, lineHeight: Math.round(size * 1.12), fontWeight: "700", letterSpacing: -0.8 }}>{children}</Text>;
}

export function Body({ children, muted = false, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text selectable style={[{ color: muted ? colors.muted : colors.text, fontSize: 17, lineHeight: 25 }, style]}>{children}</Text>;
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: accent ? "#4054a4" : colors.line, backgroundColor: accent ? "rgba(105,92,255,0.15)" : colors.panel2 }}><Text style={{ color: accent ? "#dce5ff" : colors.muted, fontSize: 13, fontWeight: "700" }}>{children}</Text></View>;
}

export function PrimaryButton({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => ({ opacity: disabled ? 0.45 : pressed ? 0.82 : 1, minHeight: 52, borderRadius: 16, overflow: "hidden", borderCurve: "continuous", borderWidth: secondary ? 1 : 0, borderColor: colors.line })}>{secondary ? <View style={{ flex: 1, minHeight: 52, justifyContent: "center", alignItems: "center", backgroundColor: colors.panel2, paddingHorizontal: 16 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{label}</Text></View> : <LinearGradient colors={[...gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ minHeight: 52, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}><Text style={{ color: colors.white, fontSize: 16, fontWeight: "800" }}>{label}</Text></LinearGradient>}</Pressable>;
}

export function ProgressBar({ value }: { value: number }) {
  const percent = Math.max(0, Math.min(100, value));
  return <View accessibilityLabel={`${Math.round(percent)} percent complete`} style={{ height: 7, borderRadius: 999, overflow: "hidden", backgroundColor: "#1b263c" }}><LinearGradient colors={[colors.cyan, colors.violet, colors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${percent}%`, height: "100%", borderRadius: 999 }} /></View>;
}

export function LoadingState({ label = "Loading Cogni…" }: { label?: string }) {
  return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", gap: 14, padding: 28 }}><ActivityIndicator color={colors.cyan} size="large" /><Text style={{ color: colors.muted, fontSize: 16 }}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}><Card><Eyebrow>Something went wrong</Eyebrow><Title size={25}>We couldn’t load this.</Title><Body muted>{message}</Body>{onRetry ? <PrimaryButton label="Try again" onPress={onRetry} /> : null}</Card></Screen>;
}

export function SkillBar({ label, score, reliability }: { label: string; score: number; reliability: number }) {
  const evidence = reliability >= 0.7 ? "Strong evidence" : reliability >= 0.35 ? "Building evidence" : "Early evidence";
  return <View style={{ gap: 8 }}><View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}><View style={{ flex: 1, gap: 2 }}><Text style={{ color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: "700" }}>{label}</Text><Text style={{ color: colors.muted, fontSize: 13 }}>{evidence}</Text></View><Text style={{ color: colors.cyan, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{Math.round(score)}</Text></View><ProgressBar value={score} /></View>;
}
