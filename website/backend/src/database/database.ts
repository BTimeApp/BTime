import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { DBLogger } from "@/logging/logger.js";
import * as schema from './schema.js';

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
