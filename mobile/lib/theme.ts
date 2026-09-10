import { Platform } from "react-native";

/**
 * Cogni 0.6 — Connected Knowledge.
 * Production tokens derived from the approved premium visual-system handoff.
 * Deep navy reading surfaces carry the experience; electric blue/cyan creates
 * action and progress; violet adds depth; warm amber/gold is reserved for
 * premium, streak and achievement moments. Semantic meaning never relies on
 * colour alone.
 */
export const colors = {
  bg: "#081026",
  bgDeep: "#050A18",
  bg2: "#0B1730",
  bgRaised: "#0D1B34",
  surface: "#0F172A",
  panel: "#0F172A",
  panel2: "#12213D",
  panel3: "#193052",
  panelQuiet: "rgba(15,31,57,.78)",
  line: "rgba(148,163,184,.24)",
  lineStrong: "#6FA8FF",
  text: "#F8FAFC",
  muted: "#C7D4EA",
  soft: "#A9B9D3",
  faint: "#7E90AD",
  cobalt: "#1E3ABA",
  blue: "#3B82F6",
  blueBright: "#2563EB",
  cyan: "#22D3EE",
  aqua: "#06B6D4",
  teal: "#14B8A6",
  violet: "#8B5CF6",
  purple: "#A78BFA",
  magenta: "#C084FC",
  green: "#22C55E",
  success: "#22C55E",
  pink: "#FB7185",
  red: "#EF4444",
  danger: "#EF4444",
  amber: "#F59E0B",
  gold: "#FBBF24",
  orange: "#F97316",
  warning: "#F59E0B",
  info: "#3B82F6",
  white: "#FFFFFF",
  ink: "#081026",
} as const;

export const gradients = {
  primary: ["#2563EB", "#3B82F6", "#8B5CF6"] as const,
  train: ["#0EA5E9", "#2563EB", "#7C3AED", "#F59E0B"] as const,
  hero: ["rgba(37,99,235,.04)", "rgba(139,92,246,.14)", "rgba(245,158,11,.08)", "#081026"] as const,
  ambient: ["rgba(37,99,235,.30)", "rgba(34,211,238,.12)", "rgba(139,92,246,.10)", "rgba(8,16,38,0)"] as const,
  panel: ["rgba(25,48,82,.97)", "rgba(15,23,42,.98)"] as const,
  panelQuiet: ["rgba(18,33,61,.90)", "rgba(10,24,45,.96)"] as const,
  success: ["#22C55E", "#14B8A6"] as const,
  error: ["#EF4444", "#F97316"] as const,
  warm: ["#F59E0B", "#F97316"] as const,
  premium: ["#F59E0B", "#FBBF24", "#8B5CF6"] as const,
  achievement: ["#8B5CF6", "#2563EB", "#FBBF24"] as const,
  progress: ["#22D3EE", "#3B82F6", "#8B5CF6"] as const,
  orb: ["#22D3EE", "#2563EB", "#8B5CF6", "#F59E0B"] as const,
  glow: ["#8B5CF6", "#22D3EE"] as const,
} as const;

export const glow = {
  cyan: "0 10px 34px rgba(34,211,238,.28)",
  blue: "0 12px 38px rgba(37,99,235,.28)",
  violet: "0 14px 42px rgba(139,92,246,.24)",
  warm: "0 12px 36px rgba(245,158,11,.22)",
  hero: "0 20px 52px rgba(0,0,0,.40)",
  success: "0 10px 34px rgba(34,197,94,.22)",
  error: "0 10px 34px rgba(239,68,68,.20)",
} as const;

const android = Platform.OS === "android";
export const typography = {
  display: { fontFamily: android ? "sans-serif" : undefined, fontWeight: "700" as const, letterSpacing: -1.15 },
  title: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "700" as const, letterSpacing: -.5 },
  heading: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: -.2 },
  body: { fontFamily: android ? "sans-serif" : undefined, fontWeight: "400" as const, letterSpacing: 0 },
  bodyMedium: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "500" as const, letterSpacing: 0 },
  label: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: .2 },
  eyebrow: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: 1.45 },
  metric: { fontFamily: android ? "sans-serif-medium" : undefined, fontWeight: "600" as const, letterSpacing: -.7 },
} as const;

export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 30, pill: 999 } as const;
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const motion = { quick: 160, standard: 240, deliberate: 360, celebration: 620, orbitMs: 26000 } as const;
