import path from "path";
import { fileURLToPath } from "url";
import baseConfig from "../eslint.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  ...baseConfig,
  {
    ignores: ["node_modules", "dist", "logs"],
    files: ["./src/**/*.ts", "./src/**/*.tsx"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: "./tsconfig.json",
      },
    },
  },
];
