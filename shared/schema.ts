import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const items = pgTable("items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  value: integer("value").notNull(),
  demand: text("demand").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradeHistory = pgTable("trade_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  yourItems: text("your_items").notNull(), // CSV string
  theirItems: text("their_items").notNull(), // CSV string
  yourValue: integer("your_value").notNull(),
  theirValue: integer("their_value").notNull(),
  verdict: text("verdict").notNull(),
  proof: text("proof"),
  status: text("status").default("pending"), // pending, accepted, declined, counter
  timestamp: timestamp("timestamp").defaultNow(),
});

export const biasSettings = pgTable("bias_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  demandTag: text("demand_tag").notNull().unique(),
  multiplier: integer("multiplier").notNull(), // stored as integer * 1000 for precision
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user"), // user, admin
});

// Insert schemas
export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeHistorySchema = createInsertSchema(tradeHistory).omit({
  id: true,
  timestamp: true,
});

export const insertBiasSettingSchema = createInsertSchema(biasSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Types
export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type TradeHistory = typeof tradeHistory.$inferSelect;
export type InsertTradeHistory = z.infer<typeof insertTradeHistorySchema>;

export type BiasSetting = typeof biasSettings.$inferSelect;
export type InsertBiasSetting = z.infer<typeof insertBiasSettingSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Validation schemas
export const demandLevels = ["high", "normal", "low", "terrible", "rising", "ok"] as const;
export const DemandLevel = z.enum(demandLevels);

export const tradeEvaluationSchema = z.object({
  yourItems: z.string().min(1, "Your items are required"),
  theirItems: z.string().min(1, "Their items are required"),
  proof: z.string().url().optional().or(z.literal("")),
});

export type TradeEvaluationRequest = z.infer<typeof tradeEvaluationSchema>;
