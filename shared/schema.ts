import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const genderEnum = pgEnum("gender", ["male", "female", "non-binary", "prefer_not_to_say"]);
export const contactPreferenceEnum = pgEnum("contact_preference", ["text", "email", "app_only"]);
export const partnershipStatusEnum = pgEnum("partnership_status", ["active", "completed", "ended_early", "cancelled"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "investigating", "resolved", "dismissed"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  gender: genderEnum("gender").notNull(),
  contactPreference: contactPreferenceEnum("contact_preference").notNull(),
  timezone: text("timezone"),
  isActive: boolean("is_active").default(true),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
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
  maxUses: varchar("max_uses").default("1"), // Number of times the code can be used
  currentUses: varchar("current_uses").default("0"), // Number of times used
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  name: true,
  gender: true,
  contactPreference: true,
  timezone: true,
}).extend({
  inviteCode: z.string().min(1, "Invite code is required"),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).pick({
  code: true,
  maxUses: true,
  expiresAt: true,
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
export type Partnership = typeof partnerships.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Exclusion = typeof exclusions.$inferSelect;
export type InsertExclusion = z.infer<typeof insertExclusionSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
