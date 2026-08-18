import React, { useEffect, useRef } from "react";
import { Redirect, Tabs } from "expo-router";
import { Animated, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CogniLogo } from "@/components/brand";
import { LoadingState } from "@/components/ui";
import { useReducedMotion } from "@/lib/accessibility";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

type TabGlyphName = "home" | "skills" | "train" | "progress" | "profile";

function TabGlyph({ name, color }: { name: TabGlyphName; color: string }) {
  if (name === "skills") {
    return <View style={{ width: 15, height: 15, borderWidth: 2, borderColor: color, borderRadius: 3, transform: [{ rotate: "45deg" }] }} />;
  }

  if (name === "train") {
    return <View style={{ width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 11, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: color, marginLeft: 3 }} />;
  }

  if (name === "progress") {
    return (
      <View style={{ width: 21, height: 20, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3 }}>
        <View style={{ width: 4, height: 8, borderRadius: 3, backgroundColor: color }} />
        <View style={{ width: 4, height: 14, borderRadius: 3, backgroundColor: color }} />
        <View style={{ width: 4, height: 19, borderRadius: 3, backgroundColor: color }} />
      </View>
    );
  }

  if (name === "profile") {
    return (
      <View style={{ width: 22, height: 22, alignItems: "center" }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: color }} />
        <View style={{ width: 17, height: 9, marginTop: 2, borderTopLeftRadius: 9, borderTopRightRadius: 9, borderWidth: 2, borderBottomWidth: 0, borderColor: color }} />
      </View>
    );
  }

  return (
    <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
      <View style={{ position: "absolute", top: 2, width: 13, height: 13, borderTopWidth: 2, borderLeftWidth: 2, borderColor: color, borderTopLeftRadius: 2, transform: [{ rotate: "45deg" }] }} />
      <View style={{ position: "absolute", bottom: 2, width: 15, height: 12, borderWidth: 2, borderTopWidth: 0, borderColor: color, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
    </View>
  );
}

function TabIcon({ name, active, emphasis = false }: { name: TabGlyphName; active: boolean; emphasis?: boolean }) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || reducedMotion) {
      scale.stopAnimation();
      scale.setValue(1);
      return;
    }
    Animated.sequence([
      Animated.spring(scale, { toValue: emphasis ? 1.08 : 1.06, damping: 12, stiffness: 250, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 15, stiffness: 220, useNativeDriver: true }),
    ]).start();
  }, [active, emphasis, reducedMotion, scale]);

  const color = active ? colors.cyan : colors.soft;

  if (emphasis) {
    return (
      <Animated.View accessible={false} style={{ width: 50, height: 36, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
        <LinearGradient
          colors={active ? ["#00b8ff", colors.violet, "#b83bff"] : ["rgba(0,184,255,.34)", "rgba(107,92,255,.44)", "rgba(184,59,255,.34)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: 48, height: 34, borderRadius: 17, borderWidth: 1, borderColor: active ? "rgba(207,243,255,.72)" : "rgba(107,130,210,.72)", alignItems: "center", justifyContent: "center", boxShadow: active ? "0 5px 18px rgba(72,105,255,.34)" : "0 3px 12px rgba(72,105,255,.16)" }}
        >
          <TabGlyph name="train" color={colors.white} />
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View accessible={false} style={{ minWidth: 30, height: 30, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
      <TabGlyph name={name} color={color} />
      {active ? <View style={{ position: "absolute", bottom: -4, width: 4, height: 4, borderRadius: 4, backgroundColor: colors.cyan }} /> : null}
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
        tabBarItemStyle: { paddingTop: 2 },
        tabBarStyle: {
          backgroundColor: "rgba(8,12,30,.985)",
          borderTopColor: "rgba(83,105,165,.48)",
          height: 70 + bottomInset,
          paddingTop: 7,
          paddingBottom: bottomInset,
          boxShadow: "0 -8px 28px rgba(0,0,0,.18)",
        },
        tabBarLabelStyle: { fontSize: 11.5, lineHeight: 15, fontWeight: "800", paddingTop: 2 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarAccessibilityLabel: "Home", tabBarIcon: ({ focused }) => <TabIcon name="home" active={focused} /> }} />
      <Tabs.Screen name="skills" options={{ title: "Skills", tabBarAccessibilityLabel: "Skills", tabBarIcon: ({ focused }) => <TabIcon name="skills" active={focused} /> }} />
      <Tabs.Screen name="train" options={{ title: "Train", tabBarAccessibilityLabel: "Train", headerShown: false, tabBarLabelStyle: { color: colors.cyan, fontSize: 12, lineHeight: 15, fontWeight: "900", paddingTop: 1 }, tabBarIcon: ({ focused }) => <TabIcon name="train" active={focused} emphasis /> }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarAccessibilityLabel: "Progress", tabBarIcon: ({ focused }) => <TabIcon name="progress" active={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarAccessibilityLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon name="profile" active={focused} /> }} />
    </Tabs>
  );
}
