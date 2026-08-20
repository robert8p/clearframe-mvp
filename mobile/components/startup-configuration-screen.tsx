import React from "react";
import { ScrollView, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export function StartupConfigurationScreen({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "900" }}>
          This Cogni build is incomplete
        </Text>
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
          The app was built without the public connection settings it needs. Your account and learning data are safe; install a verified Cogni build instead.
        </Text>
        <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.panel }}>
          <Text selectable style={{ color: colors.soft, fontSize: 13, lineHeight: 19 }}>
            {message}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
