import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Lightbulb, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { TradeEvaluation } from "@/lib/types";

interface TradeEvaluationResultProps {
  evaluation: TradeEvaluation;
  historyId?: string;
}

export function TradeEvaluationResult({ evaluation, historyId }: TradeEvaluationResultProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!historyId) throw new Error("No history ID available");
      const response = await apiRequest("PUT", `/api/trade-history/${historyId}/status`, { status });
      return response.json();
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trade-history"] });
      toast({
        title: "Status Updated",
        description: `Trade marked as ${status.toLowerCase()}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getVerdictColor = (verdict: string) => {
    if (verdict.includes("Accept") || verdict.includes("Win")) return "bg-accent/10 text-accent";
    if (verdict.includes("Decline") || verdict.includes("Lose")) return "bg-destructive/10 text-destructive";
    return "bg-secondary text-secondary-foreground";
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case "high": return "bg-accent/10 text-accent";
      case "rising": return "bg-primary/10 text-primary";
      case "low": return "bg-muted text-muted-foreground";
      case "terrible": return "bg-destructive/10 text-destructive";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-accent text-sm" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Evaluation Result</h3>
        </div>
        <Badge className={getVerdictColor(evaluation.verdict)} data-testid="text-verdict">
          {evaluation.verdict}
        </Badge>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Your Items</h4>
          {evaluation.yourDetails.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-foreground" data-testid={`text-your-item-${index}`}>
                {item.name}
              </span>
              <div className="flex items-center space-x-2">
                {item.result.demand && (
                  <Badge 
                    className={`text-xs ${getDemandColor(item.result.demand)}`}
                    data-testid={`badge-your-demand-${index}`}
                  >
                    {item.result.demand}
                  </Badge>
                )}
                <span 
                  className="font-mono text-sm text-foreground" 
                  data-testid={`text-your-value-${index}`}
                >
                  {item.result.value.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t-2 border-border">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Total Value</span>
              <span 
                className="font-bold text-xl text-foreground" 
                data-testid="text-your-total-value"
              >
                {evaluation.yourValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-medium text-foreground">Their Items</h4>
          {evaluation.theirDetails.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-foreground" data-testid={`text-their-item-${index}`}>
                {item.name}
              </span>
              <div className="flex items-center space-x-2">
                {item.result.demand && (
                  <Badge 
                    className={`text-xs ${getDemandColor(item.result.demand)}`}
                    data-testid={`badge-their-demand-${index}`}
                  >
                    {item.result.demand}
                  </Badge>
                )}
                <span 
                  className="font-mono text-sm text-foreground"
                  data-testid={`text-their-value-${index}`}
                >
                  {item.result.value.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t-2 border-border">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">Total Value</span>
              <span 
                className="font-bold text-xl text-foreground"
                data-testid="text-their-total-value"
              >
                {evaluation.theirValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {evaluation.unfoundItems.length > 0 && (
        <div className="bg-destructive/10 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-destructive mb-2">Unknown Items</h4>
          <p className="text-sm text-destructive">
            The following items were not found in the database: {evaluation.unfoundItems.join(", ")}
          </p>
        </div>
      )}
      
      <div className="bg-secondary/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-foreground mb-1">Trade Analysis</h4>
            <p className="text-sm text-muted-foreground" data-testid="text-analysis">
              {evaluation.difference > 0 
                ? `You gain ${evaluation.difference.toLocaleString()} value` 
                : evaluation.difference < 0 
                ? `You lose ${Math.abs(evaluation.difference).toLocaleString()} value` 
                : "Equal value trade"}
              . {evaluation.verdict}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Difference</div>
            <div 
              className={`text-lg font-bold ${
                evaluation.difference > 0 ? "text-accent" : 
                evaluation.difference < 0 ? "text-destructive" : 
                "text-foreground"
              }`}
              data-testid="text-difference"
            >
              {evaluation.difference > 0 ? "+" : ""}{evaluation.difference.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center space-x-4">
        <Button 
          className="bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={() => updateStatusMutation.mutate("accepted")}
          disabled={updateStatusMutation.isPending}
          data-testid="button-accept-trade"
        >
          <Check className="mr-2 h-4 w-4" />
          Accept Trade
        </Button>
        <Button 
          variant="destructive"
          onClick={() => updateStatusMutation.mutate("declined")}
          disabled={updateStatusMutation.isPending}
          data-testid="button-decline-trade"
        >
          <X className="mr-2 h-4 w-4" />
          Decline Trade
        </Button>
        <Button 
          variant="outline"
          onClick={() => updateStatusMutation.mutate("counter")}
          disabled={updateStatusMutation.isPending}
          data-testid="button-suggest-counter"
        >
          <Lightbulb className="mr-2 h-4 w-4" />
          Suggest Counter
        </Button>
      </div>
    </div>
  );
}
