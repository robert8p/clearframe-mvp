/** Cogni Nightfall. Bright edges, deep reading surfaces, never bright text backgrounds. */
export const colors = {
  bg: "#070c20", bg2: "#0b1430",
  panel: "#101c36", panel2: "#172644", panel3: "#203052",
  line: "#344569", lineStrong: "#8097bb",
  text: "#f5f7ff", muted: "#c0cce3", soft: "#b0bfd9",
  cyan: "#6eeaff", blue: "#89b4ff", violet: "#8874ff", purple: "#c4b5ff",
  magenta: "#e997ff", green: "#78e7bd", pink: "#ffaccd",
  amber: "#ffd18e", danger: "#ffb0c9", white: "#ffffff",
} as const;
export const gradients = {
  // White button labels meet 4.5:1 at every stop and along the full blend.
  primary: ["#09617e", "#304bc4", "#6242bd"] as const,
  orb: [colors.cyan, "#527dff", colors.violet, colors.magenta] as const,
  card: ["#1c2c51", "#101a35"] as const,
  cardBright: ["#28396a", "#172143"] as const,
  success: ["#174b45", "#102d36"] as const,
  warm: ["#ffcf88", "#f6a798"] as const,
};
export const glow = {
  cyan: "0 3px 24px rgba(60,207,255,0.18)",
  violet: "0 8px 30px rgba(117,83,255,0.22)",
  magenta: "0 0 28px rgba(204,141,255,0.16)",
} as const;
