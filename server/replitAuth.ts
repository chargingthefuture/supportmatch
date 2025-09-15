// Replit Auth integration - based on blueprint:javascript_log_in_with_replit
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { pool } from "./db";

// Helper function to extract invite code from OAuth state parameter
function extractInviteCodeFromState(state?: string): string | undefined {
  if (!state) return undefined;
  
  try {
    // Parse state parameter for invite code
    const parsed = JSON.parse(decodeURIComponent(state));
    return parsed.inviteCode;
  } catch {
    // If state is not JSON, treat it as a simple invite code
    return state;
  }
}

// Helper function to encode invite code in OAuth state parameter
function encodeInviteCodeInState(inviteCode?: string): string | undefined {
  if (!inviteCode) return undefined;
  
  try {
    return encodeURIComponent(JSON.stringify({ inviteCode }));
  } catch {
    return inviteCode;
  }
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  let sessionStore: any;
  let pgStoreCreated = false;
  
  // Try to use PostgreSQL session store if database is available
  if (pool) {
    try {
      console.log('[Auth] Attempting to use PostgreSQL session store');
      const pgStore = connectPg(session);
      
      // Wrap the PostgreSQL session store creation in additional try/catch
      try {
        sessionStore = new pgStore({
          pool: pool, // Use the pool from db.ts instead of connection string
          createTableIfMissing: false,
          ttl: sessionTtl / 1000, // convert to seconds for pg store
          tableName: "sessions",
          // Add error handling configuration
          errorLog: (error: Error) => {
            console.warn('[Auth] Session store error (non-fatal):', error.message);
            // Don't crash the application on session store errors
          },
          // Re-enable session pruning since we're using the shared pool
          pruneSessionInterval: 3600000, // Prune every hour (1 hour = 3600000 ms)
        });
        
        pgStoreCreated = true;
        console.log('[Auth] PostgreSQL session store configured successfully');
      } catch (pgStoreError: any) {
        console.warn('[Auth] Failed to create PostgreSQL session store instance:', pgStoreError.message);
        sessionStore = null;
      }
    } catch (error: any) {
      console.warn('[Auth] Failed to configure PostgreSQL session store:', error.message);
      console.log('[Auth] Falling back to in-memory session store');
      sessionStore = null; // Will use memory store below
    }
  } else {
    console.log('[Auth] Database pool not available, using in-memory session store');
  }
  
  // Fallback to in-memory session store
  if (!sessionStore || !pgStoreCreated) {
    console.log('[Auth] Creating in-memory session store fallback');
    try {
      const MemStore = MemoryStore(session);
      sessionStore = new MemStore({
        checkPeriod: 86400000, // prune expired entries every 24h
        ttl: sessionTtl,
        max: 1000, // limit to 1000 sessions to prevent memory issues
      });
      console.log('[Auth] In-memory session store configured successfully');
    } catch (memStoreError: any) {
      console.error('[Auth] Critical: Failed to create in-memory session store:', memStoreError.message);
      // This should never happen, but if it does, create the most basic store possible
      sessionStore = undefined; // Let express-session handle it internally
    }
  }
  
  // Create session configuration with robust error handling
  const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'fallback-dev-secret-do-not-use-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const, // CSRF protection
      maxAge: sessionTtl,
    },
  };
  
  try {
    return session(sessionConfig);
  } catch (sessionError: any) {
    console.error('[Auth] Critical: Failed to create session middleware:', sessionError.message);
    console.log('[Auth] Creating minimal session configuration');
    
    // Last resort: create the most basic session configuration
    return session({
      secret: process.env.SESSION_SECRET || 'emergency-fallback-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Disable secure in emergency mode
        maxAge: sessionTtl,
      }
    });
  }
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
  inviteCode?: string
) {
  const userId = claims["sub"];
  
  // Check if user already exists
  const existingUser = await storage.getUser(userId);
  
  if (existingUser) {
    // User exists - allow normal update without invite code validation
    await storage.upsertUser({
      id: userId,
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    return;
  }
  
  // New user - require invite code validation
  if (!inviteCode) {
    throw new Error("Invite code required for new user registration");
  }
  
  // Verify invite code
  const inviteVerification = await storage.verifyInvite(inviteCode);
  if (!inviteVerification.valid) {
    throw new Error(inviteVerification.reason || "Invalid invite code");
  }
  
  // Create new user
  await storage.upsertUser({
    id: userId,
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
  
  // Consume invite code
  await storage.consumeInvite(inviteCode, userId);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    
    try {
      // Extract invite code from state parameter if present
      const inviteCode = extractInviteCodeFromState(tokens.state as string | undefined);
      await upsertUser(tokens.claims(), inviteCode);
      verified(null, user);
    } catch (error) {
      // Pass invite code validation errors to the callback
      verified(error, null);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Extract invite code from query parameters
    const inviteCode = req.query.inviteCode as string;
    
    const authOptions: any = {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    };
    
    // Include invite code in state parameter if provided
    if (inviteCode) {
      authOptions.state = encodeInviteCodeInState(inviteCode);
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, authOptions)(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, (err: any, user: any, info: any) => {
      if (err) {
        // Handle invite code validation errors
        if (err.message && err.message.includes("Invite code")) {
          console.log("Invite code validation failed:", err.message);
          return res.redirect(`/register?error=${encodeURIComponent(err.message)}`);
        }
        return next(err);
      }
      if (!user) {
        return res.redirect("/api/login");
      }
      
      // Regenerate session for security (prevent session fixation)
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("Session regeneration error:", regenerateErr);
          return next(regenerateErr);
        }
        
        // Log in the user after session regeneration
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          return res.redirect("/");
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as any;
    const session = req.session as any;

    // Check for Replit Auth (OIDC) authentication
    if (req.isAuthenticated() && user.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      
      // Token is still valid
      if (now <= user.expires_at) {
        return next();
      }

      // Try to refresh the token
      const refreshToken = user.refresh_token;
      if (refreshToken) {
        try {
          const config = await getOidcConfig();
          const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
          updateUserSession(user, tokenResponse);
          return next();
        } catch (error) {
          // OIDC refresh failed, but don't return error yet - check local session
        }
      }
    }

    // Check for local session authentication
    if (session && session.userId) {
      try {
        // Verify user still exists and is active
        const user = await storage.getUser(session.userId);
        if (user && user.isActive) {
          // Record login activity (with database error protection)
          try {
            await storage.recordLogin(session.userId);
          } catch (loginError) {
            console.warn('[Auth] Failed to record login activity (non-fatal):', loginError);
          }
          return next();
        }
      } catch (error) {
        console.warn('[Auth] Local session verification failed:', error);
        // If database is down but session exists, continue in degraded mode
        if (session.userId) {
          console.log('[Auth] Allowing degraded authentication due to database unavailability');
          return next();
        }
      }
    }

    // Neither authentication method worked
    return res.status(401).json({ 
      message: process.env.NODE_ENV === 'production' ? "Unauthorized" : "Authentication required" 
    });
  } catch (criticalError: any) {
    console.error('[Auth] Critical error in authentication middleware:', criticalError.message);
    
    // In case of critical errors, fail safely
    return res.status(503).json({ 
      message: process.env.NODE_ENV === 'production' 
        ? "Service temporarily unavailable" 
        : `Authentication service error: ${criticalError.message}` 
    });
  }
};