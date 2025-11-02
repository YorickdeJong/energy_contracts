export interface EnergyMetrics {
  totalConsumption: number;
  averageDaily: number;
  peakUsage: number;
  costSavings: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

export interface UsageData {
  date: string;
  consumption: number;
  cost: number;
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface Analytics {
  metrics: EnergyMetrics;
  usageHistory: UsageData[];
  costBreakdown: CostBreakdown[];
  period: 'week' | 'month' | 'year';
}

export interface AnalyticsResponse {
  success: boolean;
  data: Analytics;
}
