"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { analyticsAPI } from "@/lib/api";
import type { Analytics } from "@/types/analytics";
import Card from "@/app/components/ui/Card";
import LoadingSpinner from "@/app/components/ui/LoadingSpinner";
import Badge from "@/app/components/ui/Badge";
import {
  ChartBarIcon,
  BoltIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    loadAnalytics();
  }, [session, period]);

  const loadAnalytics = async () => {
    if (!session?.accessToken) return;

    try {
      setLoading(true);
      setError(null);
      const response = await analyticsAPI.getAnalytics(session.accessToken, period);
      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics data');

      // Set mock data for demo purposes
      setAnalytics({
        metrics: {
          totalConsumption: 1247.5,
          averageDaily: 41.6,
          peakUsage: 87.3,
          costSavings: 234.50,
          trend: 'down',
          trendPercentage: 12.5,
        },
        usageHistory: [
          { date: '2025-01-26', consumption: 42.3, cost: 12.45 },
          { date: '2025-01-27', consumption: 38.7, cost: 11.23 },
          { date: '2025-01-28', consumption: 45.2, cost: 13.67 },
          { date: '2025-01-29', consumption: 41.8, cost: 12.34 },
          { date: '2025-01-30', consumption: 39.5, cost: 11.89 },
          { date: '2025-01-31', consumption: 43.1, cost: 12.78 },
          { date: '2025-02-01', consumption: 40.2, cost: 12.01 },
        ],
        costBreakdown: [
          { category: 'Electricity', amount: 145.30, percentage: 45, color: '#007AFF' },
          { category: 'Gas', amount: 97.20, percentage: 30, color: '#34C759' },
          { category: 'Water', amount: 64.80, percentage: 20, color: '#FF9500' },
          { category: 'Other', amount: 16.20, percentage: 5, color: '#86868B' },
        ],
        period,
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-error" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-success" />;
      default:
        return <MinusIcon className="h-5 w-5 text-text-secondary" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-error';
      case 'down':
        return 'text-success';
      default:
        return 'text-text-secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <div className="text-center">
            <ChartBarIcon className="mx-auto h-12 w-12 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-semibold text-text-primary">
              Unable to Load Analytics
            </h3>
            <p className="mt-2 text-sm text-text-secondary">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Energy consumption and cost insights
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                period === p
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-background-secondary text-text-secondary hover:bg-border'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Consumption */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Total Consumption
              </p>
              <p className="mt-2 text-3xl font-semibold text-text-primary">
                {analytics?.metrics.totalConsumption.toFixed(1)}
                <span className="ml-1 text-lg text-text-secondary">kWh</span>
              </p>
              <div className="mt-2 flex items-center gap-1">
                {getTrendIcon(analytics?.metrics.trend || 'stable')}
                <span className={`text-sm font-medium ${getTrendColor(analytics?.metrics.trend || 'stable')}`}>
                  {analytics?.metrics.trendPercentage.toFixed(1)}%
                </span>
                <span className="text-sm text-text-secondary">vs last {period}</span>
              </div>
            </div>
            <div className="rounded-xl bg-primary/10 p-3">
              <BoltIcon className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Average Daily */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Average Daily
              </p>
              <p className="mt-2 text-3xl font-semibold text-text-primary">
                {analytics?.metrics.averageDaily.toFixed(1)}
                <span className="ml-1 text-lg text-text-secondary">kWh</span>
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Per day this {period}
              </p>
            </div>
            <div className="rounded-xl bg-success/10 p-3">
              <ChartBarIcon className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>

        {/* Peak Usage */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Peak Usage
              </p>
              <p className="mt-2 text-3xl font-semibold text-text-primary">
                {analytics?.metrics.peakUsage.toFixed(1)}
                <span className="ml-1 text-lg text-text-secondary">kWh</span>
              </p>
              <p className="mt-2 text-sm text-text-secondary">
                Highest single day
              </p>
            </div>
            <div className="rounded-xl bg-warning/10 p-3">
              <ArrowTrendingUpIcon className="h-6 w-6 text-warning" />
            </div>
          </div>
        </Card>

        {/* Cost Savings */}
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Cost Savings
              </p>
              <p className="mt-2 text-3xl font-semibold text-text-primary">
                ${analytics?.metrics.costSavings.toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-success">
                Compared to average
              </p>
            </div>
            <div className="rounded-xl bg-success/10 p-3">
              <CurrencyDollarIcon className="h-6 w-6 text-success" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage History Chart */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Usage Trend
          </h2>
          <div className="space-y-3">
            {analytics?.usageHistory.map((day, index) => {
              const maxConsumption = Math.max(...(analytics?.usageHistory.map(d => d.consumption) || []));
              const barWidth = (day.consumption / maxConsumption) * 100;

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="font-medium text-text-primary">
                      {day.consumption.toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-background-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Cost Breakdown
          </h2>
          <div className="space-y-4">
            {analytics?.costBreakdown.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {item.percentage}%
                    </Badge>
                    <span className="text-sm font-semibold text-text-primary">
                      ${item.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-background-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text-primary">
                Total Cost
              </span>
              <span className="text-xl font-bold text-text-primary">
                ${analytics?.costBreakdown.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Note */}
      {error && (
        <Card className="border-l-4 border-warning bg-warning/5">
          <p className="text-sm text-text-secondary">
            <span className="font-semibold text-warning">Note:</span> Displaying sample data.
            Backend analytics endpoint not yet implemented.
          </p>
        </Card>
      )}
    </div>
  );
}
