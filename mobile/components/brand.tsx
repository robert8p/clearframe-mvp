import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, gradients, glow } from "@/lib/theme";

export function CogniMark({ size = 38, animated = true }: { size?: number; animated?: boolean }) {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const twinkle = useRef(new Animated.Value(0)).current;
  const motionEnabled = animated && !reducedMotion;

  useEffect(() => {
    if (!motionEnabled) {
      pulse.stopAnimation();
      twinkle.stopAnimation();
      pulse.setValue(0);
      twinkle.setValue(0);
      return;
    }
    const pulseAnim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ]));
    const twinkleAnim = Animated.loop(Animated.sequence([
      Animated.timing(twinkle, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(twinkle, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    pulseAnim.start();
    twinkleAnim.start();
    return () => { pulseAnim.stop(); twinkleAnim.stop(); };
  }, [motionEnabled, pulse, twinkle]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.58] });
  const sparkleOpacity = twinkle.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.82] });
  const h = size * 0.78;
  const node = Math.max(3, size * 0.075);

  return (
    <Animated.View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size + 12, height: size, alignItems: "center", justifyContent: "center", transform: [{ scale }] }}>
      <Animated.View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: "rgba(107,92,255,0.13)", opacity: haloOpacity, boxShadow: glow.violet }} />
      <LinearGradient
        colors={[...gradients.orb]}
        start={{ x: 0, y: 0.05 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: h, borderRadius: size * 0.31, padding: Math.max(3, size * 0.07), boxShadow: glow.cyan }}
      >
        <View style={{ flex: 1, borderRadius: size * 0.25, backgroundColor: "#0a1027", overflow: "hidden" }}>
          <View style={{ position: "absolute", left: "50%", top: size * 0.10, bottom: size * 0.10, width: 1.5, backgroundColor: "rgba(255,255,255,0.78)" }} />
          <View style={{ position: "absolute", left: size * 0.12, top: size * 0.13, width: size * 0.25, height: size * 0.13, borderTopWidth: 1.5, borderLeftWidth: 1.5, borderColor: colors.cyan, borderTopLeftRadius: size * 0.10 }} />
          <View style={{ position: "absolute", left: size * 0.14, top: size * 0.34, width: size * 0.24, height: size * 0.12, borderBottomWidth: 1.5, borderLeftWidth: 1.5, borderColor: colors.blue, borderBottomLeftRadius: size * 0.09 }} />
          <View style={{ position: "absolute", right: size * 0.12, top: size * 0.13, width: size * 0.25, height: size * 0.13, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.magenta, borderTopRightRadius: size * 0.10 }} />
          <View style={{ position: "absolute", right: size * 0.14, top: size * 0.34, width: size * 0.24, height: size * 0.12, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.purple, borderBottomRightRadius: size * 0.09 }} />
          <View style={{ position: "absolute", left: "24%", top: "31%", width: node, height: node, borderRadius: 99, backgroundColor: colors.cyan }} />
          <View style={{ position: "absolute", left: "34%", top: "60%", width: node, height: node, borderRadius: 99, backgroundColor: colors.blue }} />
          <View style={{ position: "absolute", right: "24%", top: "31%", width: node, height: node, borderRadius: 99, backgroundColor: colors.magenta }} />
          <View style={{ position: "absolute", right: "34%", top: "60%", width: node, height: node, borderRadius: 99, backgroundColor: colors.purple }} />
        </View>
      </LinearGradient>
      <View style={{ position: "absolute", left: size * 0.14, bottom: size * 0.07, width: size * 0.16, height: size * 0.16, transform: [{ rotate: "45deg" }], backgroundColor: colors.violet, borderBottomRightRadius: 3 }} />
      <Animated.Text accessible={false} style={{ position: "absolute", right: 0, top: 0, color: colors.cyan, fontSize: Math.max(8, size * 0.23), opacity: sparkleOpacity }}>✦</Animated.Text>
    </Animated.View>
  );
}

export function CogniLogo({ compact = false, centered = false, animated = true }: { compact?: boolean; centered?: boolean; animated?: boolean }) {
  const fontSize = compact ? 22 : 39;
  return (
    <View accessibilityLabel="Cogni" accessible style={{ flexDirection: "row", alignItems: "center", justifyContent: centered ? "center" : "flex-start", gap: compact ? 8 : 12 }}>
      <CogniMark size={compact ? 30 : 52} animated={animated} />
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "baseline" }}>
        <Text style={{ color: colors.text, fontSize, lineHeight: fontSize * 1.08, fontWeight: "900", letterSpacing: -1.3 }}>Cog</Text>
        <Text style={{ color: colors.purple, fontSize, lineHeight: fontSize * 1.08, fontWeight: "900", letterSpacing: -1.3 }}>ni</Text>
      </View>
    </View>
  );
}
