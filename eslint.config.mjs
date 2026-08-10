import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Supabase nested relation payloads are partially dynamic until generated DB types
      // are introduced across the legacy app. Keep this visible as lint debt without
      // making otherwise-safe releases fail solely on existing data-shape casts.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["app/**/page.tsx"],
    rules: {
      // These are async Server Components. Current time is intentionally read on the
      // server to create query windows/cohorts and is not client-render state.
      "react-hooks/purity": "off",
    },
  },
  // The Expo app has its own TypeScript/tooling lifecycle under /mobile. Do not make
  // the Next.js/Vercel pipeline parse React Native source with the web ESLint config.
  globalIgnores([".next/**", "node_modules/**", "mobile/**"]),
]);
