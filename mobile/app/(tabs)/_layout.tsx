import React from "react";
import { Redirect, Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { LoadingState } from "@/components/ui";

function Icon({ symbol, active, train = false }: { symbol: string; active: boolean; train?: boolean }) {
  if (train) return <View style={{ width: 42, height: 42, marginTop: -10, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: active ? colors.violet : "#273459", borderWidth: 2, borderColor: active ? colors.cyan : colors.line }}><Text style={{ color: colors.white, fontSize: 18 }}>{symbol}</Text></View>;
  return <Text style={{ color: active ? colors.cyan : colors.soft, fontSize: 19 }}>{symbol}</Text>;
}

export default function TabLayout() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!session) return <Redirect href="/login" />;
  return <Tabs screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text, headerShadowVisible: false, headerTitleStyle: { fontWeight: "700" }, sceneStyle: { backgroundColor: colors.bg }, tabBarActiveTintColor: colors.cyan, tabBarInactiveTintColor: colors.soft, tabBarStyle: { backgroundColor: "#091124", borderTopColor: colors.line, height: 76, paddingTop: 7, paddingBottom: 9 }, tabBarLabelStyle: { fontSize: 11, fontWeight: "700" } }}><Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <Icon symbol="⌂" active={focused} /> }} /><Tabs.Screen name="skills" options={{ title: "Skills", tabBarIcon: ({ focused }) => <Icon symbol="◈" active={focused} /> }} /><Tabs.Screen name="train" options={{ title: "Train", headerShown: false, tabBarIcon: ({ focused }) => <Icon symbol="▶" active={focused} train /> }} /><Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: ({ focused }) => <Icon symbol="▥" active={focused} /> }} /><Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ focused }) => <Icon symbol="●" active={focused} /> }} /></Tabs>;
}
