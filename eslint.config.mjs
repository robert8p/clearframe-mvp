import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing partially dynamic relation casts remain visible as warnings.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["app/**/page.tsx"],
    rules: {
      // Server Components intentionally read time to establish query windows.
      "react-hooks/purity": "off",
    },
  },
  // Separate runtimes: Expo is checked by mobile/validate; Supabase Edge Functions
  // use Deno's npm:/jsr: resolver and are typechecked/tested in mobile-ci.yml and
  // cogni-0.4.0-exact-apk.yml. Neither is a Next.js/browser source tree.
  globalIgnores([".next/**", "node_modules/**", "mobile/**", "supabase/functions/**"]),
]);
