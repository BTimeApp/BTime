import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    ignores: ["node_modules", "dist", "logs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["./src/**/*.ts", "./src/**/*.tsx"],
    plugins: {
      import: importPlugin,
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
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: path.resolve(__dirname),
        project: "./tsconfig.json",
      },
    },
  },
];
