import dotenv from "dotenv";
import { join } from "path";
import fs from "fs";

export const handleConfig = (): void => {
  const env = process.env.NODE_ENV; // "production", "development", or "test"
  const projectRoot = process.cwd(); // Project root directory

  // Load base .env
  dotenv.config({
    path: join(projectRoot, ".env"),
  });

  // Load environment-specific .env (e.g., .env.development)
  const envSpecificPath = join(projectRoot, `.env.${env}`);
  if (fs.existsSync(envSpecificPath)) {
    dotenv.config({
      path: envSpecificPath,
      override: true,
    });
  }

  // Load local override .env (e.g., .env.development.local)
  const localEnvPath = `${envSpecificPath}.local`;
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({
      path: localEnvPath,
      override: true,
    });
  }
};
