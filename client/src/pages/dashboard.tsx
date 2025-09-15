import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TradeEvaluationForm } from "@/components/trade/trade-evaluation-form";
import { TradeEvaluationResult } from "@/components/trade/trade-evaluation-result";
import { RecentTradeHistory } from "@/components/trade/recent-trade-history";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TradeEvaluation } from "@/lib/types";

export default function Dashboard() {
  const [currentEvaluation, setCurrentEvaluation] = useState<TradeEvaluation | null>(null);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Trade Evaluation</h1>
              <p className="text-muted-foreground mt-1">Evaluate ROBLOX item trades with demand-based adjustments</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>Bot Online</span>
              </div>
              <Button variant="outline" size="icon" data-testid="button-settings">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="p-8 space-y-8">
          <TradeEvaluationForm onEvaluationComplete={setCurrentEvaluation} />
          
          {currentEvaluation && (
            <TradeEvaluationResult evaluation={currentEvaluation} />
          )}
          
          <RecentTradeHistory />
          
          <QuickStats />
        </div>
      </div>
    </div>
  );
}
