import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // supabase/.temp/ is where `supabase start` writes generated runtime
    // bundles (e.g. the edge-runtime entrypoint) -- gitignored, but ESLint
    // doesn't consult .gitignore on its own. CI never sees this (lint runs
    // before `supabase start` in the workflow), but any local run of
    // `pnpm lint` *after* `supabase start` would otherwise fail on a
    // minified file nobody wrote.
    "supabase/.temp/**",
    "supabase/.branches/**",
  ]),
]);

export default eslintConfig;
