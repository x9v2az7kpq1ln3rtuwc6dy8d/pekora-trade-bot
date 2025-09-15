import { useQuery } from "@tanstack/react-query";
import { History, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { TradeHistory } from "@shared/schema";

export function RecentTradeHistory() {
  const { data: history, isLoading } = useQuery<TradeHistory[]>({
    queryKey: ["/api/trade-history"],
    queryFn: async () => {
      const response = await fetch("/api/trade-history?limit=5");
      if (!response.ok) throw new Error("Failed to fetch trade history");
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-accent/10 text-accent";
      case "declined": return "bg-destructive/10 text-destructive";
      case "counter": return "bg-secondary/50 text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
            <History className="text-muted-foreground text-sm" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Recent Evaluations</h3>
        </div>
        <Link href="/history">
          <Button variant="ghost" size="sm" data-testid="link-view-all-history">
            <ExternalLink className="mr-2 h-4 w-4" />
            View All History
          </Button>
        </Link>
      </div>
      
      {!history || history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>No trade evaluations yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Date</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">User</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Your Value</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Their Value</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Verdict</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {history.map((record) => (
                <tr key={record.id} data-testid={`row-history-${record.id}`}>
                  <td className="py-3 text-sm text-foreground" data-testid={`text-date-${record.id}`}>
                    {formatDate(record.timestamp!)}
                  </td>
                  <td className="py-3 text-sm text-foreground" data-testid={`text-user-${record.id}`}>
                    {record.userId}
                  </td>
                  <td className="py-3 text-sm font-mono text-foreground" data-testid={`text-your-value-${record.id}`}>
                    {record.yourValue.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm font-mono text-foreground" data-testid={`text-their-value-${record.id}`}>
                    {record.theirValue.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-muted-foreground" data-testid={`text-verdict-${record.id}`}>
                    {record.verdict}
                  </td>
                  <td className="py-3">
                    <Badge 
                      className={getStatusColor(record.status || "pending")}
                      data-testid={`badge-status-${record.id}`}
                    >
                      {record.status || "pending"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
