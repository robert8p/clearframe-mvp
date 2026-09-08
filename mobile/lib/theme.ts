import { Platform } from "react-native";

/**
 * Cogni 0.5 — Aurora Editorial.
 * The visual system favours deep reading surfaces, cinematic imagery and a small
 * number of luminous moments rather than neon borders around every component.
 */
export const colors = {
  bg: "#071022",
  bgDeep: "#040916",
  bg2: "#0B1730",
  bgRaised: "#0B1730",
  panel: "#0e1c36",
  panel2: "#132440",
  panel3: "#1a2f4f",
  panelQuiet: "rgba(15,31,57,.72)",
  line: "rgba(150,178,222,.17)",
  lineStrong: "#7891BA",
  text: "#F7F9FF",
  muted: "#BBC8E1",
  soft: "#8FA1C0",
  faint: "#6C7F9F",
  cyan: "#6DEBFF",
  aqua: "#53D4DC",
  blue: "#79A9FF",
  violet: "#8B78FF",
  purple: "#B8A8FF",
  magenta: "#DD9EFF",
  green: "#7EE6B9",
  pink: "#FFAAC8",
  amber: "#FFD193",
  danger: "#FFADC7",
  white: "#FFFFFF",
  ink: "#071022",
} as const;

export const gradients = {
  primary: ["#00738B", "#3151B8", "#5A3AAF"] as const,
  hero: ["rgba(7,16,34,0)", "rgba(7,16,34,.24)", "#071022"] as const,
  ambient: ["rgba(78,108,221,.30)", "rgba(42,152,193,.13)", "rgba(7,16,34,0)"] as const,
  panel: ["rgba(27,48,85,.96)", "rgba(12,27,52,.98)"] as const,
  panelQuiet: ["rgba(20,43,74,.86)", "rgba(10,24,45,.92)"] as const,
  success: ["rgba(29,100,84,.68)", "rgba(14,49,54,.82)"] as const,
  warm: ["#F6B78A", "#C790F6"] as const,
  progress: ["#66EEFF", "#72A5FF", "#A37DFF"] as const,
} as const;

export const glow = {
  cyan: "0 8px 30px rgba(74,214,255,0.18)",
  violet: "0 12px 36px rgba(126,92,255,0.18)",
  hero: "0 18px 48px rgba(0,0,0,.35)",
} as const;

const android = Platform.OS === "android";
export const typography = {
  display: { fontFamily: android ? "sans-serif" : undefined, fontWeight: "700" as const, letterSpacing: -1.2 },
  title: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "700" as const, letterSpacing: -.55 },
  heading: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: -.25 },
  body: { fontFamily: android ? "sans-serif" : undefined, fontWeight: "400" as const, letterSpacing: 0 },
  bodyMedium: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "500" as const, letterSpacing: 0 },
  label: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: .2 },
  eyebrow: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: 1.55 },
  metric: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: -.8 },
} as const;

export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 999 } as const;
export const space = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30, xxl: 40 } as const;
