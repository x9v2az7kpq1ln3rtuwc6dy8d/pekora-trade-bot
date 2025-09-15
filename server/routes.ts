import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertItemSchema, 
  insertTradeHistorySchema, 
  insertBiasSettingSchema,
  tradeEvaluationSchema,
  DemandLevel 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Trade evaluation endpoint
  app.post("/api/evaluate", async (req, res) => {
    try {
      const { yourItems, theirItems, proof } = tradeEvaluationSchema.parse(req.body);
      
      const yourItemsList = parseItemsCSV(yourItems);
      const theirItemsList = parseItemsCSV(theirItems);
      
      const evaluation = await evaluateTradeLogic(yourItemsList, theirItemsList);
      
      // Save to history
      const history = await storage.createTradeHistory({
        userId: "web-user", // In a real app, this would come from session
        yourItems,
        theirItems,
        yourValue: evaluation.yourValue,
        theirValue: evaluation.theirValue,
        verdict: evaluation.verdict,
        proof: proof || null,
        status: "pending"
      });
      
      res.json({
        ...evaluation,
        historyId: history.id
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Item management endpoints
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      const itemData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(itemData);
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid item data" });
    }
  });

  app.put("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = insertItemSchema.partial().parse(req.body);
      const item = await storage.updateItem(id, updateData);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid update data" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json({ message: "Item deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Trade history endpoints
  app.get("/api/trade-history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.getTradeHistory(limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade history" });
    }
  });

  app.put("/api/trade-history/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = z.object({ status: z.string() }).parse(req.body);
      
      const updated = await storage.updateTradeHistoryStatus(id, status);
      
      if (!updated) {
        return res.status(404).json({ message: "Trade history record not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid status" });
    }
  });

  // Bias settings endpoints
  app.get("/api/bias-settings", async (req, res) => {
    try {
      const settings = await storage.getAllBiasSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bias settings" });
    }
  });

  app.put("/api/bias-settings/:tag", async (req, res) => {
    try {
      const { tag } = req.params;
      const { multiplier } = z.object({ multiplier: z.number() }).parse(req.body);
      
      // Convert to integer (stored as multiplier * 1000)
      const multiplierInt = Math.round(multiplier * 1000);
      
      const setting = await storage.updateBiasSetting(tag, multiplierInt);
      
      if (!setting) {
        return res.status(404).json({ message: "Bias setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid multiplier" });
    }
  });

  // Export data endpoint
  app.get("/api/export/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      
      // Generate CSV content
      const csvHeader = "name,value,demand\n";
      const csvRows = items.map(item => 
        `"${item.name}",${item.value},"${item.demand}"`
      ).join("\n");
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="value_list.csv"');
      res.send(csvContent);
    } catch (error) {
      res.status(500).json({ message: "Failed to export items" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      const history = await storage.getTradeHistory();
      const accepted = history.filter(h => h.status === "accepted").length;
      
      const stats = {
        totalEvaluations: history.length,
        itemCount: items.length,
        activeUsers: 156, // This would be calculated from real user activity
        successRate: history.length > 0 ? (accepted / history.length) * 100 : 0
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function parseItemsCSV(itemsStr: string): string[] {
  if (!itemsStr || itemsStr.trim().length === 0) {
    return [];
  }
  
  return itemsStr.split(",")
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

interface ItemValueResult {
  value: number;
  found: boolean;
  baseValue: number;
  demand: string | null;
}

interface ItemDetail {
  name: string;
  result: ItemValueResult;
}

interface TradeEvaluation {
  yourValue: number;
  theirValue: number;
  difference: number;
  verdict: string;
  yourDetails: ItemDetail[];
  theirDetails: ItemDetail[];
  unfoundItems: string[];
  suggestedAdditional: number;
  suggestedGiveback: number;
}

async function getItemValueWithBias(name: string): Promise<ItemValueResult> {
  const item = await storage.getItemByName(name);
  
  if (!item) {
    return {
      value: 0,
      found: false,
      baseValue: 0,
      demand: null
    };
  }
  
  const biasSetting = await storage.getBiasSettingByTag(item.demand);
  const multiplier = biasSetting ? biasSetting.multiplier / 1000 : 1.0;
  const adjustedValue = Math.round(item.value * multiplier);
  
  return {
    value: adjustedValue,
    found: true,
    baseValue: item.value,
    demand: item.demand
  };
}

async function evaluateTradeLogic(yourItems: string[], theirItems: string[]): Promise<TradeEvaluation> {
  let yourValue = 0;
  let theirValue = 0;
  const yourDetails: ItemDetail[] = [];
  const theirDetails: ItemDetail[] = [];
  const unfoundItems: string[] = [];
  
  // Calculate your items
  for (const item of yourItems) {
    const result = await getItemValueWithBias(item);
    yourValue += result.value;
    yourDetails.push({ name: item, result });
    if (!result.found) {
      unfoundItems.push(item);
    }
  }
  
  // Calculate their items
  for (const item of theirItems) {
    const result = await getItemValueWithBias(item);
    theirValue += result.value;
    theirDetails.push({ name: item, result });
    if (!result.found) {
      unfoundItems.push(item);
    }
  }
  
  const difference = theirValue - yourValue;
  let verdict: string;
  
  if (difference >= 1000) {
    verdict = "Accept";
  } else if (difference <= -1000) {
    verdict = "Decline";
  } else {
    verdict = "Fair / Consider demand";
  }
  
  // Extra heuristic for high-demand items
  const countHighTheir = theirDetails.filter(d => d.result.demand === "high").length;
  const countHighYour = yourDetails.filter(d => d.result.demand === "high").length;
  
  if (countHighTheir - countHighYour >= 2 && difference >= -800) {
    verdict = "Consider (their high-demand items)";
  }
  
  const suggestedAdditional = yourValue > theirValue ? 
    Math.ceil((yourValue - theirValue) / 100) * 100 : 0;
  const suggestedGiveback = theirValue > yourValue ? 
    Math.ceil((theirValue - yourValue) / 100) * 100 : 0;
  
  return {
    yourValue,
    theirValue,
    difference,
    verdict,
    yourDetails,
    theirDetails,
    unfoundItems,
    suggestedAdditional,
    suggestedGiveback
  };
}
