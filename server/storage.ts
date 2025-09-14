import { type User, type InsertUser, type UpsertUser, type RegisterUser, type Partnership, type Message, type InsertMessage, type Exclusion, type InsertExclusion, type Report, type InsertReport, type InviteCode, type InsertInviteCode, users, partnerships, messages, exclusions, reports, inviteCodes } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, lte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  // Replit Auth mandatory method
  upsertUser(user: UpsertUser): Promise<User>;
  // Local auth methods
  findUserByEmail(email: string): Promise<User | undefined>;
  createLocalUser(userData: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<User>;
  recordLogin(userId: string): Promise<void>;
  setAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
  // Invite code methods for local auth
  verifyInvite(code: string): Promise<{ valid: boolean; reason?: string }>;
  consumeInvite(code: string, userId: string): Promise<InviteCode | undefined>;
  // Legacy methods
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Partnership methods
  createPartnership(user1Id: string, user2Id: string, startDate: Date, endDate: Date): Promise<Partnership>;
  getPartnership(id: string): Promise<Partnership | undefined>;
  getActivePartnershipForUser(userId: string): Promise<Partnership | undefined>;
  getUserPartnerships(userId: string): Promise<Partnership[]>;
  updatePartnership(id: string, updates: Partial<Partnership>): Promise<Partnership | undefined>;
  getPartnershipsForMatching(currentDate: Date): Promise<Partnership[]>;

  // Message methods
  createMessage(senderId: string, message: InsertMessage): Promise<Message>;
  getPartnershipMessages(partnershipId: string): Promise<Message[]>;

  // Exclusion methods
  createExclusion(userId: string, exclusion: InsertExclusion): Promise<Exclusion>;
  getUserExclusions(userId: string): Promise<Exclusion[]>;
  isUserExcluded(userId: string, potentialPartnerId: string): Promise<boolean>;

  // Report methods
  createReport(reporterId: string, report: InsertReport): Promise<Report>;
  getAllReports(): Promise<Report[]>;
  updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined>;

  // Invite code methods
  createInviteCode(createdBy: string, inviteCode: InsertInviteCode & { code: string }): Promise<InviteCode>;
  getInviteCode(code: string): Promise<InviteCode | undefined>;
  getAllInviteCodes(): Promise<InviteCode[]>;
  markInviteCodeAsUsed(code: string, usedBy: string): Promise<InviteCode | undefined>;
  deactivateInviteCode(code: string): Promise<InviteCode | undefined>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Seed admin user for development
    this.seedAdminUser();
  }

  private async seedAdminUser() {
    // Only create admin if ADMIN_TOKEN environment variable is set
    const adminToken = process.env.ADMIN_TOKEN;
    if (adminToken) {
      const adminUsername = `admin_${adminToken.substring(0, 8)}`;
      
      // Check if admin already exists
      const existingAdmin = await this.getUserByUsername(adminUsername);
      if (!existingAdmin) {
        try {
          await db.insert(users).values({
            username: adminUsername,
            name: "System Administrator",
            gender: "prefer_not_to_say",
            contactPreference: "app_only",
            timezone: null,
            isActive: true,
            isAdmin: true
          });
        } catch (error) {
          console.error('Failed to seed admin user:', error);
        }
      }
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  // Replit Auth mandatory method
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        updatedAt: new Date(),
        // Set defaults for non-Replit fields
        isActive: userData.isActive ?? true,
        isAdmin: userData.isAdmin ?? false,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        name: insertUser.name,
        gender: insertUser.gender,
        contactPreference: insertUser.contactPreference,
        timezone: insertUser.timezone || null,
        isActive: true,
        isAdmin: false
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Local auth methods
  async findUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createLocalUser(userData: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isActive: true,
        isAdmin: false,
        lastLoginAt: new Date(),
      })
      .returning();
    return user;
  }

  async recordLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async setAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isAdmin })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async verifyInvite(code: string): Promise<{ valid: boolean; reason?: string }> {
    const inviteCode = await this.getInviteCode(code);
    
    if (!inviteCode) {
      return { valid: false, reason: "Invalid invite code" };
    }
    
    if (!inviteCode.isActive) {
      return { valid: false, reason: "Invite code has been deactivated" };
    }
    
    if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
      return { valid: false, reason: "Invite code has expired" };
    }
    
    const currentUses = parseInt(inviteCode.currentUses || "0");
    const maxUses = parseInt(inviteCode.maxUses || "1");
    
    if (currentUses >= maxUses) {
      return { valid: false, reason: "Invite code has reached maximum uses" };
    }
    
    return { valid: true };
  }

  async consumeInvite(code: string, userId: string): Promise<InviteCode | undefined> {
    return await this.markInviteCodeAsUsed(code, userId);
  }

  async createPartnership(user1Id: string, user2Id: string, startDate: Date, endDate: Date): Promise<Partnership> {
    const [partnership] = await db
      .insert(partnerships)
      .values({
        user1Id,
        user2Id,
        startDate,
        endDate,
        status: "active",
        successRate: null
      })
      .returning();
    return partnership;
  }

  async getPartnership(id: string): Promise<Partnership | undefined> {
    const [partnership] = await db.select().from(partnerships).where(eq(partnerships.id, id));
    return partnership || undefined;
  }

  async getActivePartnershipForUser(userId: string): Promise<Partnership | undefined> {
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.status, "active"),
          or(
            eq(partnerships.user1Id, userId),
            eq(partnerships.user2Id, userId)
          )
        )
      );
    return partnership || undefined;
  }

  async getUserPartnerships(userId: string): Promise<Partnership[]> {
    return await db
      .select()
      .from(partnerships)
      .where(
        or(
          eq(partnerships.user1Id, userId),
          eq(partnerships.user2Id, userId)
        )
      )
      .orderBy(partnerships.createdAt);
  }

  async updatePartnership(id: string, updates: Partial<Partnership>): Promise<Partnership | undefined> {
    const [partnership] = await db
      .update(partnerships)
      .set(updates)
      .where(eq(partnerships.id, id))
      .returning();
    return partnership || undefined;
  }

  async getPartnershipsForMatching(currentDate: Date): Promise<Partnership[]> {
    return await db
      .select()
      .from(partnerships)
      .where(
        and(
          lte(partnerships.endDate, currentDate),
          eq(partnerships.status, "active")
        )
      );
  }

  async createMessage(senderId: string, insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        partnershipId: insertMessage.partnershipId,
        senderId,
        content: insertMessage.content
      })
      .returning();
    return message;
  }

  async getPartnershipMessages(partnershipId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.partnershipId, partnershipId))
      .orderBy(messages.createdAt);
  }

  async createExclusion(userId: string, insertExclusion: InsertExclusion): Promise<Exclusion> {
    const [exclusion] = await db
      .insert(exclusions)
      .values({
        userId,
        excludedUserId: insertExclusion.excludedUserId,
        reason: insertExclusion.reason || null
      })
      .returning();
    return exclusion;
  }

  async getUserExclusions(userId: string): Promise<Exclusion[]> {
    return await db
      .select()
      .from(exclusions)
      .where(eq(exclusions.userId, userId));
  }

  async isUserExcluded(userId: string, potentialPartnerId: string): Promise<boolean> {
    const [exclusion] = await db
      .select()
      .from(exclusions)
      .where(
        and(
          eq(exclusions.userId, userId),
          eq(exclusions.excludedUserId, potentialPartnerId)
        )
      );
    return !!exclusion;
  }

  async createReport(reporterId: string, insertReport: InsertReport): Promise<Report> {
    const [report] = await db
      .insert(reports)
      .values({
        reporterId,
        reportedUserId: insertReport.reportedUserId,
        partnershipId: insertReport.partnershipId || null,
        reason: insertReport.reason,
        description: insertReport.description || null,
        status: "pending"
      })
      .returning();
    return report;
  }

  async getAllReports(): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .orderBy(reports.createdAt);
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    const [report] = await db
      .update(reports)
      .set(updates)
      .where(eq(reports.id, id))
      .returning();
    return report || undefined;
  }

  async createInviteCode(createdBy: string, insertInviteCode: InsertInviteCode & { code: string }): Promise<InviteCode> {
    const [inviteCode] = await db
      .insert(inviteCodes)
      .values({
        code: insertInviteCode.code,
        createdBy,
        usedBy: null,
        isActive: true,
        maxUses: insertInviteCode.maxUses || "1",
        currentUses: "0",
        expiresAt: insertInviteCode.expiresAt || null,
        usedAt: null
      })
      .returning();
    return inviteCode;
  }

  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db.select().from(inviteCodes).where(eq(inviteCodes.code, code));
    return inviteCode || undefined;
  }

  async getAllInviteCodes(): Promise<InviteCode[]> {
    return await db
      .select()
      .from(inviteCodes)
      .orderBy(inviteCodes.createdAt);
  }

  async markInviteCodeAsUsed(code: string, usedBy: string): Promise<InviteCode | undefined> {
    const inviteCode = await this.getInviteCode(code);
    if (!inviteCode) return undefined;
    
    const currentUses = parseInt(inviteCode.currentUses || "0") + 1;
    const maxUses = parseInt(inviteCode.maxUses || "1");
    
    const [updatedInviteCode] = await db
      .update(inviteCodes)
      .set({
        usedBy,
        currentUses: currentUses.toString(),
        usedAt: new Date(),
        isActive: currentUses < maxUses
      })
      .where(eq(inviteCodes.code, code))
      .returning();
    
    return updatedInviteCode || undefined;
  }

  async deactivateInviteCode(code: string): Promise<InviteCode | undefined> {
    const [inviteCode] = await db
      .update(inviteCodes)
      .set({ isActive: false })
      .where(eq(inviteCodes.code, code))
      .returning();
    
    return inviteCode || undefined;
  }
}

export const storage = new DatabaseStorage();