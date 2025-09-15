import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Database, Users, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStats } from "@/lib/types";

export function QuickStats() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const statCards = [
    {
      name: "Total Evaluations",
      value: stats?.totalEvaluations || 0,
      change: "+12% from last month",
      icon: TrendingUp,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      name: "Items in Database",
      value: stats?.itemCount || 0,
      change: "Updated daily",
      icon: Database,
      iconColor: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      name: "Active Users",
      value: stats?.activeUsers || 0,
      change: "Last 30 days",
      icon: Users,
      iconColor: "text-muted-foreground",
      bgColor: "bg-muted/50",
    },
    {
      name: "Success Rate",
      value: `${(stats?.successRate || 0).toFixed(1)}%`,
      change: "Accepted trades",
      icon: CheckCircle,
      iconColor: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-20 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-4 gap-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        
        return (
          <div key={stat.name} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p 
                  className="text-2xl font-bold text-foreground" 
                  data-testid={`stat-${stat.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {stat.value}
                </p>
              </div>
              <div className={`w-8 h-8 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`${stat.iconColor} text-sm`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
          </div>
        );
      })}
    </div>
  );
}
