import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Determine environment and select appropriate database URL
const isProduction = process.env.NODE_ENV === 'production';

// Get the appropriate database URL based on environment
function getDatabaseUrl(): string {
  // In production, PROD_DATABASE_URL is required - never fall back to dev DB
  if (isProduction) {
    if (!process.env.PROD_DATABASE_URL) {
      throw new Error("PROD_DATABASE_URL must be set for production environment. Did you forget to provision a production database?");
    }
    return process.env.PROD_DATABASE_URL;
  }
  
  // In development, use DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const databaseUrl = getDatabaseUrl();

// Log which database is being used (minimal info in production)
if (isProduction) {
  console.log(`[DB] Connecting to production database (env: production)`);
} else {
  const urlMasked = databaseUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`[DB] Connecting to database: ${urlMasked} (env: ${process.env.NODE_ENV || 'development'})`);
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
