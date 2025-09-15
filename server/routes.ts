import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertExclusionSchema, insertReportSchema, insertInviteCodeSchema, registerUserSchema, loginUserSchema, adminBootstrapSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { validateConnection, isDbConnected, pool } from "./db";

// Legacy session tracking for backward compatibility during migration
const sessions = new Map<string, string>();

function generateSession(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    message: "Too many authentication attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 admin bootstrap attempts per windowMs
  message: {
    message: "Too many admin bootstrap attempts, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Security helper: Remove sensitive fields from user objects
function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

// Middleware to set req.userId from either Replit Auth claims or local session
function setUserId(req: any, res: any, next: any) {
  // Try OIDC claims first
  if (req.user?.claims?.sub) {
    req.userId = req.user.claims.sub;
  }
  // Fallback to local session
  else if (req.session?.userId) {
    req.userId = req.session.userId;
  }
  next();
}

// Admin middleware for both auth types
async function requireAdmin(req: any, res: any, next: any) {
  // Get userId from either OIDC claims or local session
  const userId = req.user?.claims?.sub || req.session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const user = await storage.getUser(userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Matching algorithm
async function createMonthlyMatches() {
  const activeUsers = (await storage.getAllUsers()).filter(user => user.isActive);
  const currentDate = new Date();
  const endDate = new Date(currentDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Simple matching based on gender preferences and exclusions
  const availableUsers = [];
  for (const user of activeUsers) {
    const activePartnership = await storage.getActivePartnershipForUser(user.id);
    if (!activePartnership) {
      availableUsers.push(user);
    }
  }

  // Group by gender for matching
  // Users who selected "prefer_not_to_say" are matched only with others who also selected "prefer_not_to_say"
  // This ensures both partners are comfortable with gender-flexible matching
  const usersByGender = availableUsers.reduce((acc, user) => {
    const gender = user.gender || 'prefer_not_to_say';
    if (!acc[gender]) acc[gender] = [];
    acc[gender].push(user);
    return acc;
  }, {} as Record<string, any[]>);

  // Create matches within same gender groups
  for (const [gender, users] of Object.entries(usersByGender)) {
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const user1 = shuffled[i];
      const user2 = shuffled[i + 1];
      
      // Check for mutual exclusions
      const isExcluded1 = await storage.isUserExcluded(user1.id, user2.id);
      const isExcluded2 = await storage.isUserExcluded(user2.id, user1.id);
      
      if (!isExcluded1 && !isExcluded2) {
        await storage.createPartnership(user1.id, user2.id, currentDate, endDate);
      }
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);
  
  // Health check endpoint with active database ping
  app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    try {
      const healthStatus: any = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          connected: false,
          status: 'checking',
          validationTimeMs: 0,
          coldStartDetected: false,
          lastValidatedAt: null
        }
      };

      // Always perform active database ping with timeout
      const DB_HEALTH_TIMEOUT = 2000; // 2 second timeout
      const COLD_START_THRESHOLD = 1000; // Consider > 1s as cold start
      
      try {
        const dbPingPromise = (async () => {
          if (!pool) {
            throw new Error('Database pool not available');
          }
          const queryStart = Date.now();
          // Perform lightweight ping to test actual connectivity
          await pool.query('SELECT 1 as health_check');
          return Date.now() - queryStart;
        })();

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Database health check timeout')), DB_HEALTH_TIMEOUT);
        });

        // Race between ping and timeout
        const validationTime = await Promise.race([dbPingPromise, timeoutPromise]);
        
        healthStatus.database.connected = true;
        healthStatus.database.status = 'connected';
        healthStatus.database.validationTimeMs = validationTime;
        healthStatus.database.coldStartDetected = validationTime > COLD_START_THRESHOLD;
        healthStatus.database.lastValidatedAt = new Date().toISOString();
        
        // Add cold start status to overall health
        if (healthStatus.database.coldStartDetected) {
          healthStatus.status = 'slow';
          healthStatus.database.status = 'cold_start';
        }
        
      } catch (dbError: any) {
        const validationTime = Date.now() - startTime;
        healthStatus.status = 'degraded';
        healthStatus.database.connected = false;
        healthStatus.database.status = 'error';
        healthStatus.database.validationTimeMs = validationTime;
        healthStatus.database.errorCode = dbError.code || 'UNKNOWN';
        // Don't expose full error message in production for security
        healthStatus.database.error = process.env.NODE_ENV === 'production' 
          ? 'Database connection failed' 
          : dbError.message;
      }

      // Return appropriate status code
      const statusCode = healthStatus.status === 'ok' || healthStatus.status === 'slow' ? 200 : 503;
      res.status(statusCode).json(healthStatus);
      
    } catch (error: any) {
      const validationTime = Date.now() - startTime;
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        validationTimeMs: validationTime,
        error: process.env.NODE_ENV === 'production' ? 'Health check failed' : error.message
      });
    }
  });

  // Readiness endpoint for deployment platforms
  app.get('/api/ready', async (req, res) => {
    try {
      if (!pool) {
        throw new Error('Database pool not available');
      }
      // Quick database connectivity test with short timeout
      await Promise.race([
        pool.query('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
      ]);
      res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(503).json({ status: 'not_ready', timestamp: new Date().toISOString() });
    }
  });

  // Liveness endpoint for deployment platforms
  app.get('/api/live', (req, res) => {
    // Simple liveness check without DB dependency
    res.status(200).json({ 
      status: 'alive', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Replit Auth routes
  app.get('/api/auth/user', isAuthenticated, setUserId, async (req: any, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Map database field names to frontend expectations (camelCase) and sanitize
      const mappedUser = {
        ...sanitizeUser(user),
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      res.json(mappedUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Local authentication endpoints
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      // Validate request body
      const userData = registerUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.findUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Verify invite code
      const inviteVerification = await storage.verifyInvite(userData.inviteCode);
      if (!inviteVerification.valid) {
        return res.status(400).json({ message: inviteVerification.reason });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = await storage.createLocalUser({
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
      
      // Consume invite code
      await storage.consumeInvite(userData.inviteCode, user.id);
      
      // Start local session with regeneration for security
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Registration failed" });
        }
        (req.session as any).userId = user.id;
        
        // Return sanitized user data
        res.status(201).json(sanitizeUser(user));
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      // Validate request body
      const loginData = loginUserSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.findUserByEmail(loginData.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account has been deactivated" });
      }
      
      // Record login
      await storage.recordLogin(user.id);
      
      // Start local session with regeneration for security
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        (req.session as any).userId = user.id;
        
        // Return sanitized user data
        res.json(sanitizeUser(user));
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // Clear local session
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
      });
    } else {
      res.json({ message: "Already logged out" });
    }
  });

  // Admin bootstrap endpoint for creating initial admin account
  app.post("/api/admin/bootstrap", adminLimiter, async (req, res) => {
    try {
      // Check for admin setup token
      const adminToken = req.headers.authorization?.replace('Bearer ', '');
      if (!adminToken || adminToken !== process.env.ADMIN_SETUP_TOKEN) {
        return res.status(401).json({ message: "Invalid admin setup token" });
      }

      // Validate request body
      const adminData = adminBootstrapSchema.parse(req.body);
      
      // Check if user already exists
      let user = await storage.findUserByEmail(adminData.email);
      
      if (user) {
        // User exists, just make them admin
        user = await storage.setAdmin(user.id, true);
        return res.json({ 
          message: "User promoted to admin", 
          user: { id: user!.id, email: user!.email, isAdmin: user!.isAdmin } 
        });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(adminData.password, 12);
      
      // Create new admin user
      user = await storage.createLocalUser({
        email: adminData.email,
        passwordHash,
        firstName: adminData.firstName,
        lastName: adminData.lastName
      });
      
      // Set admin privileges
      user = await storage.setAdmin(user.id, true);
      
      res.status(201).json({ 
        message: "Admin account created successfully", 
        user: { id: user!.id, email: user!.email, isAdmin: user!.isAdmin } 
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`) 
        });
      }
      console.error("Admin bootstrap error:", error);
      res.status(500).json({ message: "Admin bootstrap failed" });
    }
  });

  // User routes
  app.get("/api/users/me", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.userId);
      res.json(sanitizeUser(user));
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.put("/api/users/me", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      // SECURITY: Only allow safe fields to be updated by users
      const allowedUpdates = {
        name: req.body.name,
        gender: req.body.gender,
        timezone: req.body.timezone
      };
      // Remove undefined values
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([_, value]) => value !== undefined)
      );
      
      const user = await storage.updateUser(req.userId, sanitizedUpdates);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Partnership routes
  app.get("/api/partnerships/current", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const partnership = await storage.getActivePartnershipForUser(req.userId);
      if (!partnership) {
        return res.json(null);
      }

      const partnerId = partnership.user1Id === req.userId ? partnership.user2Id : partnership.user1Id;
      const partner = await storage.getUser(partnerId);
      
      res.json({ partnership, partner });
    } catch (error) {
      res.status(500).json({ message: "Failed to get current partnership" });
    }
  });

  app.get("/api/partnerships/history", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const partnerships = await storage.getUserPartnerships(req.userId);
      const partnershipsWithPartners = await Promise.all(
        partnerships.map(async (partnership) => {
          const partnerId = partnership.user1Id === req.userId ? partnership.user2Id : partnership.user1Id;
          const partner = await storage.getUser(partnerId);
          return { partnership, partner };
        })
      );
      
      res.json(partnershipsWithPartners);
    } catch (error) {
      res.status(500).json({ message: "Failed to get partnership history" });
    }
  });

  app.put("/api/partnerships/:id", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const partnership = await storage.updatePartnership(req.params.id, req.body);
      res.json(partnership);
    } catch (error) {
      res.status(500).json({ message: "Failed to update partnership" });
    }
  });

  // Message routes
  app.get("/api/messages/:partnershipId", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const messages = await storage.getPartnershipMessages(req.params.partnershipId);
      const messagesWithSenders = await Promise.all(
        messages.map(async (message) => {
          const sender = await storage.getUser(message.senderId);
          return { ...message, sender };
        })
      );
      
      res.json(messagesWithSenders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(req.userId, messageData);
      const sender = await storage.getUser(req.userId);
      
      res.json({ ...message, sender });
    } catch (error) {
      res.status(400).json({ message: "Failed to send message" });
    }
  });

  // Exclusion routes
  app.get("/api/exclusions", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const exclusions = await storage.getUserExclusions(req.userId);
      const exclusionsWithUsers = await Promise.all(
        exclusions.map(async (exclusion) => {
          const excludedUser = await storage.getUser(exclusion.excludedUserId);
          return { ...exclusion, excludedUser };
        })
      );
      
      res.json(exclusionsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get exclusions" });
    }
  });

  app.post("/api/exclusions", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const exclusionData = insertExclusionSchema.parse(req.body);
      
      // Check if exclusion already exists to prevent duplicates
      const existingExclusion = await storage.isUserExcluded(req.userId, exclusionData.excludedUserId);
      if (existingExclusion) {
        return res.status(409).json({ message: "User is already excluded" });
      }
      
      const exclusion = await storage.createExclusion(req.userId, exclusionData);
      res.json(exclusion);
    } catch (error) {
      res.status(400).json({ message: "Failed to create exclusion" });
    }
  });

  app.delete("/api/exclusions/:id", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      await storage.removeExclusion(req.params.id);
      res.json({ message: "Exclusion removed successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to remove exclusion" });
    }
  });

  // Report routes
  app.post("/api/reports", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(req.userId, reportData);
      res.json(report);
    } catch (error) {
      res.status(400).json({ message: "Failed to create report" });
    }
  });

  // Admin routes
  app.get("/api/admin/reports", isAuthenticated, setUserId, requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      const reportsWithUsers = await Promise.all(
        reports.map(async (report) => {
          const reporter = await storage.getUser(report.reporterId);
          const reportedUser = await storage.getUser(report.reportedUserId);
          return { ...report, reporter, reportedUser };
        })
      );
      
      res.json(reportsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get reports" });
    }
  });

  app.put("/api/admin/reports/:id", isAuthenticated, setUserId, requireAdmin, async (req, res) => {
    try {
      const report = await storage.updateReport(req.params.id, req.body);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, setUserId, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const activeUsers = users.filter(u => u.isActive);
      
      const partnerships = await Promise.all(
        activeUsers.map(user => storage.getActivePartnershipForUser(user.id))
      );
      const activePartnerships = partnerships.filter(p => p !== undefined);
      
      const reports = await storage.getAllReports();
      const pendingReports = reports.filter(r => r.status === "pending");
      
      res.json({
        activeUsers: activeUsers.length,
        currentPartnerships: activePartnerships.length / 2, // Each partnership involves 2 users
        pendingReports: pendingReports.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/admin/partnerships", isAuthenticated, setUserId, requireAdmin, async (req, res) => {
    try {
      const partnerships = await storage.getAllPartnerships();
      const partnershipsWithUsers = await Promise.all(
        partnerships.map(async (partnership) => {
          const user1 = await storage.getUser(partnership.user1Id);
          const user2 = await storage.getUser(partnership.user2Id);
          return {
            ...partnership,
            user1: user1 ? { id: user1.id, name: user1.name, email: user1.email } : null,
            user2: user2 ? { id: user2.id, name: user2.name, email: user2.email } : null
          };
        })
      );
      res.json(partnershipsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get partnerships" });
    }
  });

  app.post("/api/admin/create-matches", isAuthenticated, setUserId, requireAdmin, async (req, res) => {
    try {
      await createMonthlyMatches();
      res.json({ message: "Monthly matches created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create matches" });
    }
  });

  // Invite code management routes (admin only)
  app.get("/api/admin/invite-codes", isAuthenticated, setUserId, requireAdmin, async (req, res) => {
    try {
      const inviteCodes = await storage.getAllInviteCodes();
      const inviteCodesWithUsers = await Promise.all(
        inviteCodes.map(async (code) => {
          const creator = await storage.getUser(code.createdBy);
          const usedByUser = code.usedBy ? await storage.getUser(code.usedBy) : null;
          return {
            ...code,
            creator: creator ? { id: creator.id, username: creator.username, name: creator.name } : null,
            usedByUser: usedByUser ? { id: usedByUser.id, username: usedByUser.username, name: usedByUser.name } : null
          };
        })
      );
      res.json(inviteCodesWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get invite codes" });
    }
  });

  app.post("/api/admin/invite-codes", isAuthenticated, setUserId, requireAdmin, async (req: any, res: any) => {
    try {
      // Generate a random invite code if not provided
      const generateInviteCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const inviteCodeData = {
        code: req.body.code || generateInviteCode(),
        maxUses: req.body.maxUses || "1",
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
      };

      // Check if code already exists
      const existingCode = await storage.getInviteCode(inviteCodeData.code);
      if (existingCode) {
        return res.status(400).json({ message: "Invite code already exists" });
      }

      const inviteCode = await storage.createInviteCode(req.userId, inviteCodeData);
      res.json(inviteCode);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create invite code" });
    }
  });

  app.delete("/api/admin/invite-codes/:code", isAuthenticated, setUserId, requireAdmin, async (req, res) => {
    try {
      const inviteCode = await storage.deactivateInviteCode(req.params.code);
      if (!inviteCode) {
        return res.status(404).json({ message: "Invite code not found" });
      }
      res.json({ message: "Invite code deactivated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate invite code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
