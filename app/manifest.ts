import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cogni",
    short_name: "Cogni",
    description: "Adaptive judgement training for the AI age.",
    start_url: "/",
    display: "standalone",
    background_color: "#070d1b",
    theme_color: "#070d1b",
  };
}
