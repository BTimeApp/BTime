import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

export const handleConfig = (): void => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const env = process.env.NODE_ENV; //should either be "production", "development", or "test"

  // global env settings
  dotenv.config({
    path: join(__dirname, `../../../.env`)
  });

  const envSpecificPath: string = join(__dirname, `../../../.env.${env}`);
  // override with node env specific settings if they exist (e.g. dev settings)
  if (fs.existsSync(envSpecificPath)) {
    dotenv.config({
      path: envSpecificPath,
      override: true 
    });
  }
  
  const localEnvPath: string = envSpecificPath + ".local"
  // override with local settings if they exist
  if (fs.existsSync(localEnvPath)) {
    dotenv.config({
      path: localEnvPath,
      override: true 
    });
  }
}