import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true; // Use fetch for better serverless performance
neonConfig.fetchConnectionCache = true; // Enable connection caching for better performance

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

// Retry configuration for database connections
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const retryConfig: RetryConfig = {
  maxRetries: 5,
  baseDelay: 1000, // 1 second
  maxDelay: 30000  // 30 seconds
};

// Connection validation with retry logic
async function validateDatabaseConnection(pool: Pool): Promise<boolean> {
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(`[DB] Validating connection (attempt ${attempt}/${retryConfig.maxRetries})`);
      
      // Simple query to test connection
      const result = await pool.query('SELECT 1 as test');
      if (result.rows[0]?.test === 1) {
        console.log(`[DB] Connection validated successfully`);
        return true;
      }
    } catch (error: any) {
      const isLastAttempt = attempt === retryConfig.maxRetries;
      const baseDelay = Math.min(retryConfig.baseDelay * Math.pow(2, attempt - 1), retryConfig.maxDelay);
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 500; // 0-500ms jitter
      const delay = baseDelay + jitter;
      
      console.warn(`[DB] Connection validation failed (attempt ${attempt}/${retryConfig.maxRetries}):`, error.message);
      
      if (isLastAttempt) {
        console.error(`[DB] All connection attempts failed. Last error:`, error);
        throw new Error(`Database connection failed after ${retryConfig.maxRetries} attempts: ${error.message}`);
      }
      
      console.log(`[DB] Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Create pool with optimized settings for Neon serverless
const poolConfig = {
  connectionString: databaseUrl,
  max: 3, // Reduced for serverless - fewer connections reduce cold start issues
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 15000, // Increased timeout for cold starts
};

// Log which database is being used (minimal info in production)
if (isProduction) {
  console.log(`[DB] Connecting to production database (env: production)`);
} else {
  const urlMasked = databaseUrl.replace(/:[^:@]*@/, ':****@');
  console.log(`[DB] Connecting to database: ${urlMasked} (env: ${process.env.NODE_ENV || 'development'})`);
}

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });

// Database connection status
let isConnectionValidated = false;

// Validate connection on module load (async)
export const validateConnection = async (): Promise<void> => {
  if (!isConnectionValidated) {
    try {
      await validateDatabaseConnection(pool);
      isConnectionValidated = true;
    } catch (error) {
      console.error('[DB] Failed to validate database connection:', error);
      throw error;
    }
  }
};

// Export connection status checker
export const isDbConnected = (): boolean => isConnectionValidated;

// Schema validation - check if required tables exist
export async function validateSchema(): Promise<boolean> {
  try {
    // Check if users table exists by querying the information schema
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as table_exists
    `);
    
    const tableExists = result.rows[0]?.table_exists === true;
    
    if (tableExists) {
      console.log('[DB] Schema validation passed - users table exists');
      return true;
    } else {
      console.warn('[DB] Schema validation failed - users table does not exist');
      console.warn('[DB] Run "npm run db:push" to create the database schema');
      return false;
    }
  } catch (error: any) {
    // Check if this is a transient error that should be retried
    const isTransientError = TRANSIENT_ERROR_CODES.some(code => 
      error.code === code || error.message?.includes(code) || 
      error.message?.includes('timeout') || error.message?.includes('ECONNRESET')
    );
    
    if (isTransientError) {
      console.warn('[DB] Schema validation failed with transient error:', error.message);
      throw error; // Rethrow so retry logic can handle it
    } else {
      console.error('[DB] Schema validation failed with non-transient error:', error.message);
      return false; // Non-transient errors should not be retried
    }
  }
}

// Schema validation with retry logic
export async function validateSchemaWithRetry(): Promise<boolean> {
  return await withRetry(
    () => validateSchema(),
    'schema validation',
    2 // Only retry twice for schema checks
  );
}

// Transient error codes that should trigger retries
const TRANSIENT_ERROR_CODES = ['XX000', '57P03', '53300', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];

// Query-level retry helper for transient errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isTransientError = TRANSIENT_ERROR_CODES.some(code => 
        error.code === code || error.message?.includes(code) || 
        error.message?.includes('timeout') || error.message?.includes('ECONNRESET')
      );
      
      if (!isTransientError || isLastAttempt) {
        console.error(`[DB] ${operationName} failed (non-transient or final attempt):`, error.message);
        throw error;
      }
      
      const baseDelay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms
      const jitter = Math.random() * 100; // 0-100ms jitter
      const delay = baseDelay + jitter;
      
      console.warn(`[DB] ${operationName} failed with transient error (attempt ${attempt}/${maxRetries}):`, error.message);
      console.log(`[DB] Retrying ${operationName} in ${Math.round(delay)}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error(`${operationName} failed after ${maxRetries} attempts`);
}
