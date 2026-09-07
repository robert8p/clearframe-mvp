export const colors = {
  bg: "#070b19",
  bg2: "#0b1023",
  panel: "#10182a",
  panel2: "#172138",
  panel3: "#1c2942",
  line: "#2a3a57",
  lineStrong: "#657b9b",
  text: "#f4f7fb",
  muted: "#aebdd3",
  soft: "#96a9c3",
  cyan: "#66e3cd",
  blue: "#759bff",
  violet: "#7868ef",
  purple: "#b5a2ff",
  magenta: "#ff4fd8",
  green: "#69dfb3",
  pink: "#ec4899",
  amber: "#ffb020",
  danger: "#ff8dc7",
  white: "#ffffff",
} as const;

export const gradients = {
  primary: ["#3156b8", "#5045bb", "#6749b4"] as const,
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
