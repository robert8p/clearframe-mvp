import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cogni",
    short_name: "Cogni",
    description: "Short daily practice for clearer thinking and better decisions.",
    start_url: "/",
    display: "standalone",
    background_color: "#070d1b",
    theme_color: "#070d1b",
  };
}
