import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMessageSchema, insertExclusionSchema, insertReportSchema, insertInviteCodeSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";

// Legacy session tracking for backward compatibility during migration
const sessions = new Map<string, string>();

function generateSession(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Middleware to set req.userId from Replit Auth claims for legacy compatibility
function setUserId(req: any, res: any, next: any) {
  if (req.user?.claims?.sub) {
    req.userId = req.user.claims.sub;
  }
  next();
}

// Admin middleware for Replit Auth
async function requireAdmin(req: any, res: any, next: any) {
  const userId = req.user?.claims?.sub;
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

  // Group by gender
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
  
  // Replit Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // SECURITY: Legacy auth endpoints DISABLED - all auth now through Replit Auth
  app.post("/api/auth/register", (req, res) => {
    res.status(410).json({ 
      message: "Legacy registration disabled. Please use Replit Auth.", 
      loginUrl: "/api/login" 
    });
  });

  app.post("/api/auth/login", (req, res) => {
    res.status(410).json({ 
      message: "Legacy login disabled. Please use Replit Auth.", 
      loginUrl: "/api/login" 
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.status(410).json({ 
      message: "Legacy logout disabled. Please use Replit Auth.", 
      logoutUrl: "/api/logout" 
    });
  });

  // User routes
  app.get("/api/users/me", isAuthenticated, setUserId, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.userId);
      res.json(user);
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
        contactPreference: req.body.contactPreference,
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
      const exclusion = await storage.createExclusion(req.userId, exclusionData);
      res.json(exclusion);
    } catch (error) {
      res.status(400).json({ message: "Failed to create exclusion" });
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
