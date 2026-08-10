export const colors = {
  bg: "#060b16",
  bg2: "#081022",
  panel: "#0d162b",
  panel2: "#111a34",
  line: "#24314f",
  text: "#f5f7ff",
  muted: "#9da9c6",
  soft: "#7383a5",
  cyan: "#22d3ee",
  blue: "#168cff",
  violet: "#695cff",
  purple: "#a83dff",
  green: "#29d67d",
  pink: "#ec4899",
  amber: "#f59e0b",
  white: "#ffffff",
} as const;

export const gradients = {
  primary: [colors.blue, colors.violet, colors.purple] as const,
  orb: ["#18dff6", "#3577ff", "#a83dff"] as const,
  card: ["#111a34", "#0d162b"] as const,
};
