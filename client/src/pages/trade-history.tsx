import { useQuery } from "@tanstack/react-query";
import { History, ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { TradeHistory } from "@shared/schema";

export default function TradeHistoryPage() {
  const { data: history, isLoading } = useQuery<TradeHistory[]>({
    queryKey: ["/api/trade-history"],
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-card border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Trade History</h1>
              <p className="text-muted-foreground mt-1">Complete history of all trade evaluations</p>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-muted/50 rounded-lg flex items-center justify-center">
                <History className="text-muted-foreground text-sm" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">All Trade Evaluations</h2>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No trade history found</h3>
                <p>Start evaluating trades to see them appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Your Items</TableHead>
                      <TableHead>Their Items</TableHead>
                      <TableHead>Your Value</TableHead>
                      <TableHead>Their Value</TableHead>
                      <TableHead>Verdict</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Proof</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id} data-testid={`row-history-${record.id}`}>
                        <TableCell className="text-sm" data-testid={`text-date-${record.id}`}>
                          {formatDate(record.timestamp!)}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-user-${record.id}`}>
                          {record.userId}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" data-testid={`text-your-items-${record.id}`}>
                          {record.yourItems}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate" data-testid={`text-their-items-${record.id}`}>
                          {record.theirItems}
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`text-your-value-${record.id}`}>
                          {record.yourValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`text-their-value-${record.id}`}>
                          {record.theirValue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-verdict-${record.id}`}>
                          {record.verdict}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={getStatusColor(record.status || "pending")}
                            data-testid={`badge-status-${record.id}`}
                          >
                            {record.status || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.proof ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(record.proof!, '_blank')}
                              data-testid={`button-proof-${record.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
