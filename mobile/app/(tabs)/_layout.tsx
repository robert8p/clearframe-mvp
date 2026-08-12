import React, { useEffect, useRef } from "react";
import { Redirect, Tabs } from "expo-router";
import { Animated, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CogniLogo } from "@/components/brand";
import { useAuth } from "@/lib/auth";
import { colors, gradients, glow } from "@/lib/theme";
import { LoadingState } from "@/components/ui";

function TabIcon({ symbol, active, train = false }: { symbol: string; active: boolean; train?: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) Animated.sequence([
      Animated.spring(scale, { toValue: 1.16, damping: 10, stiffness: 260, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 240, useNativeDriver: true }),
    ]).start();
  }, [active, scale]);

  if (train) return (
    <Animated.View style={{ transform: [{ scale }], marginTop: -12 }}>
      <LinearGradient colors={[...gradients.primary]} style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,229,255,.55)", boxShadow: glow.violet }}>
        <Text style={{ color: colors.white, fontSize: 18, fontWeight: "900" }}>{symbol}</Text>
      </LinearGradient>
    </Animated.View>
  );

  return <Animated.View style={{ minWidth: 28, height: 26, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}><Text style={{ color: active ? colors.cyan : colors.soft, fontSize: 20, fontWeight: active ? "900" : "700" }}>{symbol}</Text>{active ? <View style={{ position: "absolute", bottom: -2, width: 4, height: 4, borderRadius: 4, backgroundColor: colors.cyan, boxShadow: glow.cyan }} /> : null}</Animated.View>;
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
        headerTitle: () => <CogniLogo compact />,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.soft,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: "rgba(8,12,30,.98)",
          borderTopColor: "rgba(55,72,132,.62)",
          height: 66 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          boxShadow: "0 -10px 30px rgba(0,0,0,.22)",
        },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: "800", paddingTop: 1 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon symbol="⌂" active={focused} /> }} />
      <Tabs.Screen name="skills" options={{ title: "Skills", tabBarIcon: ({ focused }) => <TabIcon symbol="◇" active={focused} /> }} />
      <Tabs.Screen name="train" options={{ title: "Train", headerShown: false, tabBarIcon: ({ focused }) => <TabIcon symbol="▶" active={focused} train /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ focused }) => <TabIcon symbol="▥" active={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon symbol="◎" active={focused} /> }} />
    </Tabs>
  );
}
