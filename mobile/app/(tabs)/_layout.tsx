import React, { useEffect, useRef } from "react";
import { Redirect, Tabs } from "expo-router";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CogniLogo } from "@/components/brand";
import { useReducedMotion } from "@/lib/accessibility";
import { useAuth } from "@/lib/auth";
import { colors, glow } from "@/lib/theme";
import { LoadingState } from "@/components/ui";

function TabIcon({ symbol, active }: { symbol: string; active: boolean }) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || reducedMotion) {
      scale.stopAnimation();
      scale.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.10, damping: 11, stiffness: 250, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 13, stiffness: 230, useNativeDriver: true }),
    ]).start();
  }, [active, reducedMotion, scale]);

  return (
    <Animated.View accessible={false} style={{ minWidth: 30, height: 30, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
      <Text style={{ color: active ? colors.cyan : colors.soft, fontSize: symbol === "▶" ? 18 : 20, fontWeight: active ? "900" : "700" }}>{symbol}</Text>
      {active ? <View style={{ position: "absolute", bottom: -2, width: 5, height: 5, borderRadius: 5, backgroundColor: colors.cyan, boxShadow: glow.cyan }} /> : null}
    </Animated.View>
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
        headerTitle: () => <CogniLogo compact animated={false} />,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.soft,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "rgba(8,12,30,.98)",
          borderTopColor: "rgba(83,105,165,.72)",
          height: 68 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          boxShadow: "0 -10px 30px rgba(0,0,0,.22)",
        },
        tabBarLabelStyle: { fontSize: 12.5, lineHeight: 16, fontWeight: "800", paddingTop: 1 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarAccessibilityLabel: "Home", tabBarIcon: ({ focused }) => <TabIcon symbol="⌂" active={focused} /> }} />
      <Tabs.Screen name="skills" options={{ title: "Skills", tabBarAccessibilityLabel: "Skills", tabBarIcon: ({ focused }) => <TabIcon symbol="◇" active={focused} /> }} />
      <Tabs.Screen name="train" options={{ title: "Train", tabBarAccessibilityLabel: "Train", headerShown: false, tabBarIcon: ({ focused }) => <TabIcon symbol="▶" active={focused} /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarAccessibilityLabel: "Progress", tabBarIcon: ({ focused }) => <TabIcon symbol="▥" active={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarAccessibilityLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon symbol="◎" active={focused} /> }} />
    </Tabs>
  );
}
