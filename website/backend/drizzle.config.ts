import { defineConfig } from 'drizzle-kit';
import { handleConfig } from './src/server/load-config.js';

// If running drizzle-kit manually, default to development environment
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
handleConfig();

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URI!,
  },
});
