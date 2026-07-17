"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import {
  getMonthlySalesChart,
  getSalesReport,
  getTopSellingProducts,
  getPaymentMethodBreakdown,
  type Order,
} from "@/lib/api";
import { monthlyRestockData, revenueTrendData } from "@/lib/data";

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

// Fixed palette for payment methods so colors stay consistent between renders.
const paymentMethodColors: Record<string, string> = {
  CASH: "hsl(var(--primary))",
  MPESA: "#16A34A",
  BANK_TRANSFER: "#F59E0B",
  CREDIT: "#64748B",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT: "Credit",
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastNDaysRange(n: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (n - 1));
  return { start: isoDate(start), end: isoDate(end) };
}

/** Buckets completed orders into a fixed N-day series, oldest first. */
function bucketOrdersByDay(orders: Order[], days = 7) {
  const buckets: { day: string; sales: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDate(d);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    const total = orders
      .filter((o) => o.status === "COMPLETED" && o.createdAt.slice(0, 10) === key)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);
    buckets.push({ day: label, sales: total });
  }

  return buckets;
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-muted/40 animate-pulse"
      style={{ height }}
    >
      <span className="text-xs text-muted-foreground">Loading chart...</span>
    </div>
  );
}

function ChartEmpty({ height = 280, message = "No data yet" }: { height?: number; message?: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg bg-muted/20" style={{ height }}>
      <span className="text-xs text-muted-foreground">{message}</span>
    </div>
  );
}

export function DailySalesChart() {
  const [data, setData] = useState<{ day: string; sales: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = lastNDaysRange(7);
    getSalesReport(start, end)
      .then((res) => {
        if (!cancelled) setData(bucketOrdersByDay(res?.data ?? [], 7));
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Sales Trend</CardTitle>
        <CardDescription>Revenue over the past 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <ChartSkeleton />
        ) : data.every((d) => d.sales === 0) ? (
          <ChartEmpty message="No completed orders in the last 7 days" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number) => [formatCurrency(value), "Sales"]}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlySalesChart() {
  const [data, setData] = useState<Array<{ month: string; sales: number }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMonthlySalesChart()
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const maxSales = data ? Math.max(...data.map((d) => d.sales), 1) : 1;
  const useMillions = maxSales >= 1000000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Sales</CardTitle>
        <CardDescription>Revenue by month (KES)</CardDescription>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <ChartSkeleton />
        ) : data.length === 0 ? (
          <ChartEmpty message="No sales recorded yet" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => (useMillions ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`)}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number) => [formatCurrency(value), "Sales"]}
              />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function SalesTrendChart() {
  const [dailyData, setDailyData] = useState<{ day: string; sales: number }[] | null>(null);
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; sales: number }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = lastNDaysRange(7);

    getSalesReport(start, end)
      .then((res) => {
        if (!cancelled) setDailyData(bucketOrdersByDay(res?.data ?? [], 7));
      })
      .catch(() => {
        if (!cancelled) setDailyData([]);
      });

    getMonthlySalesChart()
      .then((res) => {
        if (!cancelled) setMonthlyData(res?.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setMonthlyData([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const maxMonthlySales = monthlyData ? Math.max(...monthlyData.map((d) => d.sales), 1) : 1;
  const useMillions = maxMonthlySales >= 1000000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales Trend</CardTitle>
        <CardDescription>Revenue over time</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily (7 days)</TabsTrigger>
            <TabsTrigger value="monthly">Monthly (YTD)</TabsTrigger>
          </TabsList>
          <TabsContent value="daily" className="mt-4">
            {dailyData === null ? (
              <ChartSkeleton />
            ) : dailyData.every((d) => d.sales === 0) ? (
              <ChartEmpty message="No completed orders in the last 7 days" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="salesGradientTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number) => [formatCurrency(value), "Sales"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#salesGradientTrend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            {monthlyData === null ? (
              <ChartSkeleton />
            ) : monthlyData.length === 0 ? (
              <ChartEmpty message="No sales recorded yet" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => (useMillions ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`)}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number) => [formatCurrency(value), "Sales"]}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function PaymentMethodChart() {
  const [data, setData] = useState<{ name: string; value: number; color: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = lastNDaysRange(30);

    getPaymentMethodBreakdown(start, end)
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? [];
        const total = rows.reduce((sum, r) => sum + Number(r.totalAmount), 0);
        setData(
          rows.map((r) => ({
            name: paymentMethodLabels[r.paymentMethod] ?? r.paymentMethod,
            value: total > 0 ? Math.round((Number(r.totalAmount) / total) * 100) : 0,
            color: paymentMethodColors[r.paymentMethod] ?? "hsl(var(--muted-foreground))",
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment Methods</CardTitle>
        <CardDescription>Distribution by payment type (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <ChartSkeleton />
        ) : data.length === 0 ? (
          <ChartEmpty message="No payments recorded in the last 30 days" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name} ${value}%`}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}%`, "Share"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function TopProductsChart() {
  const [data, setData] = useState<{ name: string; sales: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { start, end } = lastNDaysRange(30);

    getTopSellingProducts(start, end, 5)
      .then((res) => {
        if (!cancelled) setData((res?.data ?? []).map((p) => ({ name: p.name, sales: p.quantity })));
      })
      .catch(() => {
        if (!cancelled) setData([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Selling Products</CardTitle>
        <CardDescription>By units sold (last 30 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <ChartSkeleton />
        ) : data.length === 0 ? (
          <ChartEmpty message="No product sales in the last 30 days" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number) => [value, "Units Sold"]}
              />
              <Bar dataKey="sales" fill="#16A34A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * NOTE — still hardcoded, on purpose:
 * getRestockCostReport() and getProfitReport() only return single aggregate
 * totals for a date range, not a month-by-month / week-by-week series, so
 * there's no real endpoint to wire these two charts up to yet. Fixing them
 * properly needs either:
 *   (a) a dedicated backend endpoint (e.g. /reports/monthly-restocks,
 *       /reports/revenue-trend) that returns pre-bucketed series, or
 *   (b) fetching the full restock/order list client-side and bucketing by
 *       month/week here — workable but inefficient and imprecise at scale.
 * Flagging rather than guessing, so this doesn't quietly ship as fake data
 * next to the ones that are now real.
 */

export function MonthlyRestockChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Restock Trend</CardTitle>
        <CardDescription>Quantity and cost over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={monthlyRestockData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip contentStyle={chartTooltipStyle} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="quantity"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              name="Quantity"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cost"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Cost (KES)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RevenueTrendChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Revenue & Profit Trend</CardTitle>
        <CardDescription>Weekly performance overview</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={revenueTrendData}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revenueGrad)" name="Revenue" />
            <Area type="monotone" dataKey="profit" stroke="#16A34A" fill="url(#profitGrad)" name="Profit" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}