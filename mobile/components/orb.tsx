import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "@/lib/theme";

export function CogniOrb({ size = 180 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulseAnim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const floatAnim = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 3900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 3900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const rotateAnim = Animated.loop(Animated.timing(rotate, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
    pulseAnim.start(); floatAnim.start(); rotateAnim.start();
    return () => { pulseAnim.stop(); floatAnim.stop(); rotateAnim.stop(); };
  }, [float, pulse, rotate]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [3, -5] });
  const rotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <View style={{ width: size + 34, height: size + 42, alignItems: "center", justifyContent: "center" }}>
    <Animated.View style={{ position: "absolute", width: size + 28, height: size + 28, borderRadius: (size + 28) / 2, borderWidth: 1, borderColor: "rgba(94,91,255,0.35)", transform: [{ rotate: rotation }] }}><View style={{ position: "absolute", top: -3, left: "50%", width: 7, height: 7, borderRadius: 7, backgroundColor: "#63eaff" }} /></Animated.View>
    <Animated.View style={{ transform: [{ translateY }, { scale }], borderRadius: size / 2, boxShadow: "0 0 55px rgba(64,116,255,0.36)" }}><LinearGradient colors={[...gradients.orb]} start={{ x: 0.08, y: 0.06 }} end={{ x: 0.95, y: 0.92 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}><View style={{ width: Math.max(36, size * 0.24), height: Math.max(36, size * 0.24), borderRadius: 999, borderWidth: 4, borderColor: "rgba(255,255,255,0.95)", borderStyle: "dotted" }} /></LinearGradient></Animated.View>
  </View>;
}
