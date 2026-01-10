import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import path from "path";
import { fileURLToPath } from "url";
import baseConfig from "../eslint.config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    ignores: [
      "node_modules",
      "dist",
      "eslint.config.ts",
      "tailwind.config.js",
      "vite.config.js",
    ],
  },
  ...baseConfig,
  {
    files: ["./src/**/*.ts", "./src/**/*.tsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      // --- react plugin rules ---
      ...reactPlugin.configs.recommended.rules,

      // --- react-hooks plugin rules ---
      ...reactHooksPlugin.configs.recommended.rules,

      // React 19: disable rule that assumes React must be in scope
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },

    settings: {
      react: {
        version: "detect",
      },
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        tsconfigRootDir: __dirname,
        project: "./tsconfig.json",
      },
    },
  },
];
