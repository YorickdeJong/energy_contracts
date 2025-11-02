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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-text-primary">Analytics</h1>
          <p className="mt-2 text-lg text-text-secondary">
            Track your energy consumption and costs
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 bg-background-secondary p-1 rounded-xl">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-all ${
                period === p
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
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
        <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-primary">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <BoltIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary uppercase tracking-wide">
              Total Consumption
            </p>
            <p className="mt-2 text-4xl font-bold text-text-primary">
              {analytics?.metrics.totalConsumption.toFixed(1)}
              <span className="ml-2 text-xl text-text-tertiary font-normal">kWh</span>
            </p>
            <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-background-secondary rounded-lg w-fit">
              {getTrendIcon(analytics?.metrics.trend || 'stable')}
              <span className={`text-sm font-semibold ${getTrendColor(analytics?.metrics.trend || 'stable')}`}>
                {analytics?.metrics.trendPercentage.toFixed(1)}%
              </span>
              <span className="text-sm text-text-tertiary">vs last {period}</span>
            </div>
          </div>
        </Card>

        {/* Average Daily */}
        <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <ChartBarIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary uppercase tracking-wide">
              Average Daily
            </p>
            <p className="mt-2 text-4xl font-bold text-text-primary">
              {analytics?.metrics.averageDaily.toFixed(1)}
              <span className="ml-2 text-xl text-text-tertiary font-normal">kWh</span>
            </p>
            <p className="mt-3 text-sm text-text-secondary px-3 py-1.5 bg-green-50 rounded-lg w-fit">
              Per day this {period}
            </p>
          </div>
        </Card>

        {/* Peak Usage */}
        <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-orange-500">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
              <ArrowTrendingUpIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary uppercase tracking-wide">
              Peak Usage
            </p>
            <p className="mt-2 text-4xl font-bold text-text-primary">
              {analytics?.metrics.peakUsage.toFixed(1)}
              <span className="ml-2 text-xl text-text-tertiary font-normal">kWh</span>
            </p>
            <p className="mt-3 text-sm text-text-secondary px-3 py-1.5 bg-orange-50 rounded-lg w-fit">
              Highest single day
            </p>
          </div>
        </Card>

        {/* Cost Savings */}
        <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-emerald-500">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
              <CurrencyDollarIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary uppercase tracking-wide">
              Cost Savings
            </p>
            <p className="mt-2 text-4xl font-bold text-emerald-600">
              ${analytics?.metrics.costSavings.toFixed(2)}
            </p>
            <p className="mt-3 text-sm font-medium text-emerald-600 px-3 py-1.5 bg-emerald-50 rounded-lg w-fit">
              Compared to average
            </p>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Usage History Chart */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">
              Usage Trend
            </h2>
          </div>
          <div className="space-y-4">
            {analytics?.usageHistory.map((day, index) => {
              const maxConsumption = Math.max(...(analytics?.usageHistory.map(d => d.consumption) || []));
              const barWidth = (day.consumption / maxConsumption) * 100;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text-secondary">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="font-semibold text-text-primary">
                      {day.consumption.toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-blue-100 to-blue-50 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 shadow-sm"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Cost Breakdown */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">
              Cost Breakdown
            </h2>
          </div>
          <div className="space-y-5">
            {analytics?.costBreakdown.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-lg shadow-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-semibold text-text-primary">
                      {item.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-text-secondary bg-background-secondary px-2.5 py-1 rounded-full">
                      {item.percentage}%
                    </span>
                    <span className="text-sm font-bold text-text-primary min-w-[70px] text-right">
                      ${item.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="relative h-3 w-full rounded-full bg-background-secondary overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 shadow-sm"
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
          <div className="mt-6 pt-6 border-t-2 border-border">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
              <span className="text-sm font-bold text-text-primary uppercase tracking-wide">
                Total Cost
              </span>
              <span className="text-2xl font-bold text-emerald-600">
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
