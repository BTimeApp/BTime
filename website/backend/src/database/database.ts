import * as schema from './schema.js';
import { DBLogger } from "@/logging/logger.js";
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import pg from 'pg';
import { fileURLToPath } from "url";

export let db: ReturnType<typeof drizzle<typeof schema>>;

export const connectToDB = async () => {
  if (!process.env.DB_URI) {
    throw new Error("DB_URI must be set in environment");
  }

  try {
    const pool = new pg.Pool({
      connectionString: process.env.DB_URI,
    });
    
    const client = await pool.connect();
    client.release();
    DBLogger.info("Connected to PostgreSQL DB.");

    db = drizzle(pool, { schema });
  } catch (err) {
    DBLogger.error({ err }, "Error when connecting to PostgreSQL DB");
    process.exit(1);
  }
};

export const runMigrations = async () => {
  DBLogger.info("Running database migrations...");
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const migrationsFolder = path.join(__dirname, "..", "..", "drizzle");
    await migrate(db, { migrationsFolder });
    DBLogger.info("Database migrations complete.");
  } catch (err) {
    DBLogger.error({ err }, "Database migration failed");
    throw err;
  }
};
