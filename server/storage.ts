import { type User, type InsertUser, type Partnership, type Message, type InsertMessage, type Exclusion, type InsertExclusion, type Report, type InsertReport, type InviteCode, type InsertInviteCode } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
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
  createInviteCode(createdBy: string, inviteCode: InsertInviteCode): Promise<InviteCode>;
  getInviteCode(code: string): Promise<InviteCode | undefined>;
  getAllInviteCodes(): Promise<InviteCode[]>;
  markInviteCodeAsUsed(code: string, usedBy: string): Promise<InviteCode | undefined>;
  deactivateInviteCode(code: string): Promise<InviteCode | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private partnerships: Map<string, Partnership>;
  private messages: Map<string, Message>;
  private exclusions: Map<string, Exclusion>;
  private reports: Map<string, Report>;
  private inviteCodes: Map<string, InviteCode>;

  constructor() {
    this.users = new Map();
    this.partnerships = new Map();
    this.messages = new Map();
    this.exclusions = new Map();
    this.reports = new Map();
    this.inviteCodes = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      isActive: true, 
      isAdmin: false,
      createdAt: new Date(),
      timezone: insertUser.timezone || null
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createPartnership(user1Id: string, user2Id: string, startDate: Date, endDate: Date): Promise<Partnership> {
    const id = randomUUID();
    const partnership: Partnership = {
      id,
      user1Id,
      user2Id,
      startDate,
      endDate,
      status: "active" as const,
      successRate: null,
      createdAt: new Date()
    };
    this.partnerships.set(id, partnership);
    return partnership;
  }

  async getPartnership(id: string): Promise<Partnership | undefined> {
    return this.partnerships.get(id);
  }

  async getActivePartnershipForUser(userId: string): Promise<Partnership | undefined> {
    return Array.from(this.partnerships.values()).find(
      (partnership) => 
        partnership.status === "active" && 
        (partnership.user1Id === userId || partnership.user2Id === userId)
    );
  }

  async getUserPartnerships(userId: string): Promise<Partnership[]> {
    return Array.from(this.partnerships.values()).filter(
      (partnership) => 
        partnership.user1Id === userId || partnership.user2Id === userId
    ).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async updatePartnership(id: string, updates: Partial<Partnership>): Promise<Partnership | undefined> {
    const partnership = this.partnerships.get(id);
    if (!partnership) return undefined;
    
    const updatedPartnership = { ...partnership, ...updates };
    this.partnerships.set(id, updatedPartnership);
    return updatedPartnership;
  }

  async getPartnershipsForMatching(currentDate: Date): Promise<Partnership[]> {
    return Array.from(this.partnerships.values()).filter(
      (partnership) => partnership.endDate <= currentDate && partnership.status === "active"
    );
  }

  async createMessage(senderId: string, insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      senderId,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getPartnershipMessages(partnershipId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((message) => message.partnershipId === partnershipId)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async createExclusion(userId: string, insertExclusion: InsertExclusion): Promise<Exclusion> {
    const id = randomUUID();
    const exclusion: Exclusion = {
      ...insertExclusion,
      id,
      userId,
      createdAt: new Date(),
      reason: insertExclusion.reason || null
    };
    this.exclusions.set(id, exclusion);
    return exclusion;
  }

  async getUserExclusions(userId: string): Promise<Exclusion[]> {
    return Array.from(this.exclusions.values()).filter(
      (exclusion) => exclusion.userId === userId
    );
  }

  async isUserExcluded(userId: string, potentialPartnerId: string): Promise<boolean> {
    const exclusions = await this.getUserExclusions(userId);
    return exclusions.some((exclusion) => exclusion.excludedUserId === potentialPartnerId);
  }

  async createReport(reporterId: string, insertReport: InsertReport): Promise<Report> {
    const id = randomUUID();
    const report: Report = {
      ...insertReport,
      id,
      reporterId,
      status: "pending" as const,
      createdAt: new Date(),
      description: insertReport.description || null,
      partnershipId: insertReport.partnershipId || null
    };
    this.reports.set(id, report);
    return report;
  }

  async getAllReports(): Promise<Report[]> {
    return Array.from(this.reports.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report | undefined> {
    const report = this.reports.get(id);
    if (!report) return undefined;
    
    const updatedReport = { ...report, ...updates };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }

  async createInviteCode(createdBy: string, insertInviteCode: InsertInviteCode): Promise<InviteCode> {
    const id = randomUUID();
    const inviteCode: InviteCode = {
      ...insertInviteCode,
      id,
      createdBy,
      usedBy: null,
      isActive: true,
      maxUses: insertInviteCode.maxUses || "1",
      currentUses: "0",
      expiresAt: insertInviteCode.expiresAt || null,
      createdAt: new Date(),
      usedAt: null
    };
    this.inviteCodes.set(insertInviteCode.code, inviteCode);
    return inviteCode;
  }

  async getInviteCode(code: string): Promise<InviteCode | undefined> {
    return this.inviteCodes.get(code);
  }

  async getAllInviteCodes(): Promise<InviteCode[]> {
    return Array.from(this.inviteCodes.values()).sort((a, b) => 
      b.createdAt!.getTime() - a.createdAt!.getTime()
    );
  }

  async markInviteCodeAsUsed(code: string, usedBy: string): Promise<InviteCode | undefined> {
    const inviteCode = this.inviteCodes.get(code);
    if (!inviteCode) return undefined;
    
    const currentUses = parseInt(inviteCode.currentUses || "0") + 1;
    const maxUses = parseInt(inviteCode.maxUses || "1");
    
    const updatedInviteCode = { 
      ...inviteCode, 
      usedBy,
      currentUses: currentUses.toString(),
      usedAt: new Date(),
      isActive: currentUses < maxUses // Deactivate if max uses reached
    };
    this.inviteCodes.set(code, updatedInviteCode);
    return updatedInviteCode;
  }

  async deactivateInviteCode(code: string): Promise<InviteCode | undefined> {
    const inviteCode = this.inviteCodes.get(code);
    if (!inviteCode) return undefined;
    
    const updatedInviteCode = { ...inviteCode, isActive: false };
    this.inviteCodes.set(code, updatedInviteCode);
    return updatedInviteCode;
  }
}

export const storage = new MemStorage();
