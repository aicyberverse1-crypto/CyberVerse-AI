import { pgTable, text, serial, integer, timestamp, real, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  totalScore: integer("total_score").notNull().default(0),
  hintPoints: integer("hint_points").notNull().default(500),
  hackerType: text("hacker_type").notNull().default("defender"),
  skillPoints: integer("skill_points").notNull().default(0),
  unlockedSkills: jsonb("unlocked_skills").notNull().default([]),
  rankTier: text("rank_tier").notNull().default("Bronze"),
  accuracyRate: real("accuracy_rate").notNull().default(0),
  totalAnswers: integer("total_answers").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  averageResponseTime: real("average_response_time").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastClaimedAt: timestamp("last_claimed_at"),
  lastLoginAt: timestamp("last_login_at"),
  dailyScore: integer("daily_score").notNull().default(0),
  lastDailyReset: timestamp("last_daily_reset"),
  isTopHacker: boolean("is_top_hacker").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true, xp: true, level: true, totalScore: true, createdAt: true,
  hintPoints: true, skillPoints: true, unlockedSkills: true, rankTier: true,
  accuracyRate: true, totalAnswers: true, correctAnswers: true, averageResponseTime: true,
  streakDays: true, lastClaimedAt: true, lastLoginAt: true, dailyScore: true,
  lastDailyReset: true, isTopHacker: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
