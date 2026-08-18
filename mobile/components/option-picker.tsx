import React from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/lib/theme";
import type { ContextOption } from "@/lib/context-options";

export function OptionPicker({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: ContextOption[]; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 21, fontWeight: "800" }}>{label}</Text>
      {hint ? <Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18 }}>{hint}</Text> : null}
      <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((item) => {
          const selected = value === item.value;
          return (
            <Pressable
              key={`${label}:${item.value || "none"}`}
              accessibilityRole="radio"
              accessibilityLabel={`${label}: ${item.label}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(item.value)}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: 142,
                minHeight: 48,
                justifyContent: "center",
                paddingHorizontal: 13,
                paddingVertical: 10,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: selected ? colors.cyan : colors.lineStrong,
                backgroundColor: selected ? "rgba(107,92,255,.18)" : colors.panel2,
                opacity: pressed ? 0.78 : 1,
              })}
            >
              <Text style={{ color: selected ? colors.text : colors.muted, fontSize: 13.5, lineHeight: 18, fontWeight: selected ? "900" : "700", textAlign: "center" }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
