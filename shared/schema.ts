import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const genderEnum = pgEnum("gender", ["male", "female", "non-binary", "prefer_not_to_say"]);
export const partnershipStatusEnum = pgEnum("partnership_status", ["active", "completed", "ended_early", "cancelled"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "investigating", "resolved", "dismissed"]);
export const announcementTypeEnum = pgEnum("announcement_type", ["info", "warning", "maintenance", "update", "promotion"]);

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Replit Auth fields
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // Local auth field
  passwordHash: varchar("password_hash"), // For local email/password auth
  lastLoginAt: timestamp("last_login_at"),
  // Legacy/app-specific fields (nullable since not provided by Replit Auth)
  username: text("username").unique(),
  name: text("name"),
  gender: genderEnum("gender"),
  timezone: text("timezone"),
  isActive: boolean("is_active").default(true),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const partnerships = pgTable("partnerships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user1Id: varchar("user1_id").notNull().references(() => users.id),
  user2Id: varchar("user2_id").notNull().references(() => users.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: partnershipStatusEnum("status").default("active"),
  successRate: text("success_rate"), // JSON string for tracking progress
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnershipId: varchar("partnership_id").notNull().references(() => partnerships.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exclusions = pgTable("exclusions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  excludedUserId: varchar("excluded_user_id").notNull().references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  partnershipId: varchar("partnership_id").references(() => partnerships.id),
  reason: text("reason").notNull(),
  description: text("description"),
  status: reportStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  usedBy: varchar("used_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  maxUses: text("max_uses").default("1"), // Number of times the code can be used
  currentUses: text("current_uses").default("0"), // Number of times used
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: announcementTypeEnum("type").default("info"),
  isActive: boolean("is_active").default(true),
  showOnLogin: boolean("show_on_login").default(true),
  showOnSignInPage: boolean("show_on_sign_in_page").default(false),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  name: true,
  gender: true,
  timezone: true,
}).extend({
  inviteCode: z.string().min(1, "Invite code is required"),
});

// Registration schema for local auth
export const registerUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  inviteCode: z.string().min(1, "Invite code is required"),
});

// Login schema for local auth
export const loginUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Admin bootstrap schema
export const adminBootstrapSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).pick({
  maxUses: true,
  expiresAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).pick({
  title: true,
  content: true,
  type: true,
  isActive: true,
  showOnLogin: true,
  showOnSignInPage: true,
  expiresAt: true,
}).extend({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  partnershipId: true,
  content: true,
});

export const insertExclusionSchema = createInsertSchema(exclusions).pick({
  excludedUserId: true,
  reason: true,
});

export const insertReportSchema = createInsertSchema(reports).pick({
  reportedUserId: true,
  partnershipId: true,
  reason: true,
  description: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
// Replit Auth types
export type UpsertUser = typeof users.$inferInsert;
// Local auth types
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type AdminBootstrap = z.infer<typeof adminBootstrapSchema>;
export type Partnership = typeof partnerships.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Exclusion = typeof exclusions.$inferSelect;
export type InsertExclusion = z.infer<typeof insertExclusionSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
