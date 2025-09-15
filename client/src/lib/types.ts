export interface ItemDetail {
  name: string;
  result: {
    value: number;
    found: boolean;
    baseValue: number;
    demand: string | null;
  };
}

export interface TradeEvaluation {
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

export interface DashboardStats {
  totalEvaluations: number;
  itemCount: number;
  activeUsers: number;
  successRate: number;
}
