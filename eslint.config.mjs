import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Underscore-prefixed names are the project's way of omitting a field while destructuring.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }],
      // Plain <img> is intended for small static SVG art and the OG image renderer.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // The tests build elements with createElement and pass children through props to satisfy the provider's types.
    files: ["tests/**/*.ts"],
    rules: { "react/no-children-prop": "off" },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**", "playwright-report/**", "test-results/**", ".firecrawl/**", ".claude/**", "public/**", "next-env.d.ts"]),
]);
