import { 
  type User, 
  type InsertUser, 
  type Item, 
  type InsertItem,
  type TradeHistory,
  type InsertTradeHistory,
  type BiasSetting,
  type InsertBiasSetting,
  items,
  tradeHistory,
  biasSettings,
  users
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Item operations
  getAllItems(): Promise<Item[]>;
  getItemByName(name: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;

  // Trade history operations
  getTradeHistory(limit?: number): Promise<TradeHistory[]>;
  createTradeHistory(history: InsertTradeHistory): Promise<TradeHistory>;
  updateTradeHistoryStatus(id: string, status: string): Promise<TradeHistory | undefined>;

  // Bias settings operations
  getAllBiasSettings(): Promise<BiasSetting[]>;
  getBiasSettingByTag(tag: string): Promise<BiasSetting | undefined>;
  createBiasSetting(setting: InsertBiasSetting): Promise<BiasSetting>;
  updateBiasSetting(tag: string, multiplier: number): Promise<BiasSetting | undefined>;

  // Database seeding
  seedData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private isSeeded = false;

  async ensureSeeded() {
    if (!this.isSeeded) {
      await this.seedData();
      this.isSeeded = true;
    }
  }

  async seedData() {
    try {
      // Check if data already exists
      const existingItems = await db.select().from(items).limit(1);
      if (existingItems.length > 0) {
        console.log('Database already seeded, skipping...');
        return;
      }

      console.log('Seeding database with initial data...');

      // Create admin user
      await db.insert(users).values({
        username: "admin",
        password: "admin123", // In production, this should be hashed
        role: "admin"
      }).onConflictDoNothing();

      // Seed items from the Java code
      const seedItems = [
        { name: "Black Sparkle Time Fedora", value: 9000, demand: "high" },
        { name: "Green Sparkle Time Fedora", value: 11000, demand: "high" },
        { name: "Midnight Blue Sparkle Time Fedora", value: 18500, demand: "normal" },
        { name: "Orange Sparkle Time Fedora", value: 4500, demand: "normal" },
        { name: "Pink Sparkle Time Fedora", value: 7250, demand: "normal" },
        { name: "Red Sparkle Time Fedora", value: 18500, demand: "high" },
        { name: "Purple Sparkle Time Fedora", value: 2750, demand: "low" },
        { name: "Sky Blue Sparkle Time Fedora", value: 8500, demand: "low" },
        { name: "Sparkle Time Fedora", value: 4000, demand: "low" },
        { name: "Blackvalk", value: 15000, demand: "high" },
        { name: "Ice Valkyrie", value: 2500, demand: "low" },
        { name: "Emerald Valkyrie", value: 7250, demand: "normal" },
        { name: "Tixvalk", value: 2500, demand: "low" },
        { name: "Valkyrie Helm", value: 0, demand: "high" },
        { name: "Dominus Astra", value: 25000, demand: "low" },
        { name: "Dominus Empyreus", value: 60000, demand: "high" },
        { name: "Dominus Frigidus", value: 20000, demand: "high" },
        { name: "Dominus Infernus", value: 35000, demand: "low" },
        { name: "Dominus Messor", value: 2750, demand: "low" },
        { name: "Dominus Praefectus", value: 1234, demand: "terrible" },
        { name: "Dominus Rex", value: 5000, demand: "low" },
        { name: "Dominus Vespertilio", value: 4500, demand: "low" },
        { name: "Dominus Aureus", value: 14000, demand: "low" },
        { name: "Domino Crown", value: 25000, demand: "low" },
        { name: "Red Domino Crown", value: 16000, demand: "terrible" },
      ];

      await db.insert(items).values(seedItems).onConflictDoNothing();

      // Seed default bias settings
      const defaultBiases = [
        { demandTag: "high", multiplier: 1100 },
        { demandTag: "normal", multiplier: 1000 },
        { demandTag: "low", multiplier: 900 },
        { demandTag: "terrible", multiplier: 800 },
        { demandTag: "rising", multiplier: 1200 },
        { demandTag: "ok", multiplier: 1000 },
      ];

      await db.insert(biasSettings).values(defaultBiases).onConflictDoNothing();

      console.log('Database seeded successfully');
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    await this.ensureSeeded();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    await this.ensureSeeded();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureSeeded();
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, role: "user" })
      .returning();
    return user;
  }

  // Item operations
  async getAllItems(): Promise<Item[]> {
    await this.ensureSeeded();
    return await db.select().from(items).orderBy(items.name);
  }

  async getItemByName(name: string): Promise<Item | undefined> {
    await this.ensureSeeded();
    const [item] = await db.select()
      .from(items)
      .where(ilike(items.name, name));
    return item || undefined;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    await this.ensureSeeded();
    const [item] = await db
      .insert(items)
      .values(insertItem)
      .returning();
    return item;
  }

  async updateItem(id: string, updateData: Partial<InsertItem>): Promise<Item | undefined> {
    await this.ensureSeeded();
    const [updated] = await db
      .update(items)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteItem(id: string): Promise<boolean> {
    await this.ensureSeeded();
    const result = await db.delete(items).where(eq(items.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Trade history operations
  async getTradeHistory(limit: number = 50): Promise<TradeHistory[]> {
    await this.ensureSeeded();
    return await db.select()
      .from(tradeHistory)
      .orderBy(desc(tradeHistory.timestamp))
      .limit(limit);
  }

  async createTradeHistory(insertHistory: InsertTradeHistory): Promise<TradeHistory> {
    await this.ensureSeeded();
    const [history] = await db
      .insert(tradeHistory)
      .values({ ...insertHistory, status: insertHistory.status || "pending" })
      .returning();
    return history;
  }

  async updateTradeHistoryStatus(id: string, status: string): Promise<TradeHistory | undefined> {
    await this.ensureSeeded();
    const [updated] = await db
      .update(tradeHistory)
      .set({ status })
      .where(eq(tradeHistory.id, id))
      .returning();
    return updated || undefined;
  }

  // Bias settings operations
  async getAllBiasSettings(): Promise<BiasSetting[]> {
    await this.ensureSeeded();
    return await db.select().from(biasSettings);
  }

  async getBiasSettingByTag(tag: string): Promise<BiasSetting | undefined> {
    await this.ensureSeeded();
    const [setting] = await db.select()
      .from(biasSettings)
      .where(eq(biasSettings.demandTag, tag));
    return setting || undefined;
  }

  async createBiasSetting(insertSetting: InsertBiasSetting): Promise<BiasSetting> {
    await this.ensureSeeded();
    const [setting] = await db
      .insert(biasSettings)
      .values(insertSetting)
      .returning();
    return setting;
  }

  async updateBiasSetting(tag: string, multiplier: number): Promise<BiasSetting | undefined> {
    await this.ensureSeeded();
    const [updated] = await db
      .update(biasSettings)
      .set({ multiplier, updatedAt: new Date() })
      .where(eq(biasSettings.demandTag, tag))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();