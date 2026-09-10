import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, glow, motion, typography } from "@/lib/theme";

/** Compact connected-knowledge mark. The full orbital illustration remains special;
 * this reduced form is safe for headers, loading and the Train control. */
export function CogniMark({ size = 34, animated = true }: { size?: number; animated?: boolean }) {
  const reducedMotion = useReducedMotion();
  const orbit = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const motionEnabled = animated && !reducedMotion;

  useEffect(() => {
    if (!motionEnabled) {
      orbit.stopAnimation(); pulse.stopAnimation(); orbit.setValue(0); pulse.setValue(0); return;
    }
    const orbital = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: motion.orbitMs, easing: Easing.linear, useNativeDriver: true }));
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    orbital.start(); breathing.start();
    return () => { orbital.stop(); breathing.stop(); };
  }, [motionEnabled, orbit, pulse]);

  const rotation = orbit.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const planet = Math.max(3.5, size * .12);
  return (
    <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
      <Animated.View style={{ position: "absolute", width: size * .92, height: size * .58, borderRadius: size, borderWidth: 1, borderColor: "rgba(111,168,255,.48)", transform: [{ rotate: rotation }, { rotateX: "18deg" }] }}>
        <View style={{ position: "absolute", top: -planet * .45, left: size * .17, width: planet, height: planet, borderRadius: planet, backgroundColor: colors.cyan, boxShadow: glow.cyan }} />
        <View style={{ position: "absolute", bottom: -planet * .45, right: size * .13, width: planet * .82, height: planet * .82, borderRadius: planet, backgroundColor: colors.violet }} />
      </Animated.View>
      <View style={{ position: "absolute", width: size * .68, height: size * .88, borderRadius: size, borderWidth: 1, borderColor: "rgba(139,92,246,.42)", transform: [{ rotate: "48deg" }] }}>
        <View style={{ position: "absolute", top: size * .12, right: -planet * .42, width: planet * .85, height: planet * .85, borderRadius: planet, backgroundColor: colors.amber, boxShadow: glow.warm }} />
      </View>
      <View style={{ borderRadius: size, boxShadow: glow.blue }}>
        <LinearGradient colors={[colors.cyan, colors.blueBright, colors.violet]} start={{ x: .08, y: .08 }} end={{ x: .9, y: .9 }} style={{ width: size * .38, height: size * .38, borderRadius: size, borderWidth: 1, borderColor: "rgba(255,255,255,.42)" }} />
      </View>
    </Animated.View>
  );
}

export function CogniLogo({ compact = false, centered = false, animated = false }: { compact?: boolean; centered?: boolean; animated?: boolean }) {
  const fontSize = compact ? 25 : 42;
  return (
    <View accessibilityLabel="Cogni" accessible style={{ flexDirection: "row", alignItems: "center", justifyContent: centered ? "center" : "flex-start" }}>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "relative", paddingRight: compact ? 2 : 3 }}>
        <Text allowFontScaling={false} style={{ color: colors.text, fontSize, lineHeight: fontSize * 1.03, ...typography.display }}>Cogni</Text>
        <LinearGradient colors={[colors.cyan, colors.aqua]} style={{ position: "absolute", right: compact ? 0 : 1, top: compact ? -1 : -2, width: compact ? 6 : 9, height: compact ? 6 : 9, borderRadius: 9, boxShadow: glow.cyan }} />
      </View>
      {animated ? <View style={{ marginLeft: compact ? 8 : 12 }}><CogniMark size={compact ? 22 : 28} /></View> : null}
    </View>
  );
}
