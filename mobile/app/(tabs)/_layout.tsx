import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { colors, gradients } from "@/lib/theme";
import { LoadingState } from "@/components/ui";

function Icon({ symbol, active, train = false }: { symbol: string; active: boolean; train?: boolean }) {
  if (train) {
    return (
      <View
        style={{
          width: 42,
          height: 42,
          marginTop: -10,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? colors.violet : "#273459",
          borderWidth: 2,
          borderColor: active ? colors.cyan : colors.line,
        }}
      >
        <Text style={{ color: colors.white, fontSize: 18 }}>{symbol}</Text>
      </View>
    );
  }

  return <Text style={{ color: active ? colors.cyan : colors.soft, fontSize: 19 }}>{symbol}</Text>;
}

function BrandHeader() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
      <LinearGradient
        colors={[...gradients.orb]}
        start={{ x: 0.05, y: 0.05 }}
        end={{ x: 0.95, y: 0.95 }}
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "rgba(99,234,255,0.42)",
        }}
      >
        <View
          style={{
            width: 11,
            height: 11,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: colors.white,
            borderStyle: "dotted",
          }}
        />
      </LinearGradient>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.6 }}>Cogni</Text>
    </View>
  );
}

export default function TabLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) return <LoadingState />;
  if (!session) return <Redirect href="/login" />;

  const bottomInset = Math.max(insets.bottom, 10);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerTitle: () => <BrandHeader />,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.soft,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "#091124",
          borderTopColor: colors.line,
          height: 64 + bottomInset,
          paddingTop: 7,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "800" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <Icon symbol="⌂" active={focused} /> }} />
      <Tabs.Screen name="skills" options={{ title: "Skills", tabBarIcon: ({ focused }) => <Icon symbol="◈" active={focused} /> }} />
      <Tabs.Screen name="train" options={{ title: "Train", headerShown: false, tabBarIcon: ({ focused }) => <Icon symbol="▶" active={focused} train /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ focused }) => <Icon symbol="▥" active={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <Icon symbol="●" active={focused} /> }} />
    </Tabs>
  );
}
