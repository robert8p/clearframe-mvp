import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CogniMark } from "@/components/brand";
import { useReducedMotion } from "@/lib/accessibility";
import { colors, gradients, glow } from "@/lib/theme";

export function CogniOrb({ size = 180 }: { size?: number }) {
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      pulse.stopAnimation();
      float.stopAnimation();
      rotate.stopAnimation();
      shimmer.stopAnimation();
      pulse.setValue(0);
      float.setValue(0);
      rotate.setValue(0);
      shimmer.setValue(0);
      return;
    }
    const pulseAnim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const floatAnim = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const rotateAnim = Animated.loop(Animated.timing(rotate, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
    const shimmerAnim = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(shimmer, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ]));
    pulseAnim.start();
    floatAnim.start();
    rotateAnim.start();
    shimmerAnim.start();
    return () => { pulseAnim.stop(); floatAnim.stop(); rotateAnim.stop(); shimmerAnim.stop(); };
  }, [float, pulse, reducedMotion, rotate, shimmer]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1.025] });
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [3, -4] });
  const rotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const glowOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.30, 0.58] });

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: size + 82, height: size + 98, alignItems: "center", justifyContent: "center" }}>
      <LinearGradient colors={["transparent", "rgba(0,229,255,.16)", "transparent"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: "absolute", width: size * 0.72, height: size * 0.92, bottom: 4, opacity: 0.46 }} />
      <Animated.View style={{ position: "absolute", width: size + 58, height: size + 58, borderRadius: (size + 58) / 2, borderWidth: 1, borderColor: "rgba(107,92,255,.24)", transform: [{ rotate: rotation }] }}>
        <View style={{ position: "absolute", top: -4, left: "50%", width: 8, height: 8, borderRadius: 8, backgroundColor: colors.cyan, boxShadow: glow.cyan }} />
        <View style={{ position: "absolute", bottom: 16, right: 11, width: 5, height: 5, borderRadius: 5, backgroundColor: colors.magenta }} />
      </Animated.View>
      <Animated.View style={{ position: "absolute", width: size + 22, height: size + 22, borderRadius: (size + 22) / 2, backgroundColor: "rgba(86,74,255,.14)", opacity: glowOpacity, boxShadow: glow.violet }} />
      <Animated.View style={{ transform: [{ translateY }, { scale }], borderRadius: size / 2, boxShadow: "0 0 56px rgba(58,88,255,0.36)" }}>
        <LinearGradient colors={[...gradients.orb]} start={{ x: 0.03, y: 0.03 }} end={{ x: 0.96, y: 0.96 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", padding: Math.max(5, size * 0.045) }}>
          <View style={{ flex: 1, alignSelf: "stretch", borderRadius: size / 2, backgroundColor: "rgba(6,11,30,.88)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.12)" }}>
            <CogniMark size={Math.max(42, size * 0.46)} animated={false} />
          </View>
        </LinearGradient>
      </Animated.View>
      <View style={{ position: "absolute", bottom: 7, width: size * 0.72, height: size * 0.12, borderRadius: 999, backgroundColor: "rgba(54,64,255,.16)", borderWidth: 1, borderColor: "rgba(0,229,255,.20)", transform: [{ scaleY: 0.42 }], boxShadow: glow.cyan }} />
    </View>
  );
}
