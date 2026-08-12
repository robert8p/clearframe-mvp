import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export function StatusLabel({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel={typeof children === "string" ? children : undefined}
      style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4 }}
    >
      <View
        accessible={false}
        style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent ? colors.cyan : colors.soft }}
      />
      <Text style={{ color: accent ? colors.text : colors.muted, fontSize: 13.5, lineHeight: 19, fontWeight: "800" }}>{children}</Text>
    </View>
  );
}

export function CompactAction({ label, onPress, hint, accent = false }: { label: string; onPress: () => void; hint?: string; accent?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: accent ? "rgba(0,229,255,.52)" : colors.lineStrong,
        backgroundColor: accent ? "rgba(24,42,82,.96)" : "rgba(16,23,53,.94)",
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 13.5, lineHeight: 19, fontWeight: "900" }}>{label}</Text>
      <Text accessible={false} style={{ color: accent ? colors.cyan : colors.purple, fontSize: 19, lineHeight: 20, fontWeight: "900" }}>›</Text>
    </Pressable>
  );
}
