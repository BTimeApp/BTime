import js from "@eslint/js";
import ts from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: ["node_modules", "dist", "eslint.config.ts"],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    plugins: {
      import: importPlugin,
      "@typescript-eslint": ts.plugin,
    },
    rules: {
      // 2 groups: Types and everything else, newline in between. Alphabetize imports
      "import/order": [
        "error",
        {
          groups: ["type", "object"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],

      // --- consistent type imports rules ---
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],
    },
  },
];
