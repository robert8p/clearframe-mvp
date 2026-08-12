export const colors = {
  bg: "#070b19",
  bg2: "#0b1023",
  panel: "#101735",
  panel2: "#151e3f",
  panel3: "#1b2650",
  line: "#31416f",
  lineStrong: "#5369a5",
  text: "#f7f8ff",
  muted: "#aab4d6",
  soft: "#8194c4",
  cyan: "#00e5ff",
  blue: "#1686ff",
  violet: "#6b5cff",
  purple: "#b855ff",
  magenta: "#ff4fd8",
  green: "#22d3a4",
  pink: "#ec4899",
  amber: "#ffb020",
  danger: "#ff8dc7",
  white: "#ffffff",
} as const;

export const gradients = {
  primary: ["#00b8ff", colors.violet, "#c12dff"] as const,
  orb: [colors.cyan, "#3567ff", colors.purple, colors.magenta] as const,
  card: ["rgba(27,38,80,0.96)", "rgba(12,18,43,0.98)"] as const,
  cardBright: ["rgba(38,46,100,0.98)", "rgba(16,22,56,0.98)"] as const,
  success: ["#16d6a0", "#087f69"] as const,
  warm: ["#ffb020", "#ff6b4a"] as const,
};

export const glow = {
  cyan: "0 0 28px rgba(0,229,255,0.24)",
  violet: "0 0 34px rgba(107,92,255,0.28)",
  magenta: "0 0 32px rgba(255,79,216,0.20)",
} as const;
