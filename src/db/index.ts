import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgres://dummy:dummy@localhost:5432/dummy';

if (!process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL environment variable is missing. Falling back to dummy URL for build-time compilation.');
}

// Reuse connection client in development to prevent leaks on hot reload
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(connectionString, { 
  prepare: false,
  max: 10,            // Limit max connections per server instance
  idle_timeout: 20,   // Close idle connections after 20s to release database load
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });

