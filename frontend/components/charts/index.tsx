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
import {
  dailySalesData,
  monthlySalesData,
  paymentMethodData,
  topSellingProducts,
  monthlyRestockData,
  revenueTrendData,
} from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { getMonthlySalesChart } from "@/lib/api";

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

export function DailySalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily Sales Trend</CardTitle>
        <CardDescription>Revenue over the past 7 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={dailySalesData}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
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
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function MonthlySalesChart() {
  const [data, setData] = useState<Array<{ month: string; sales: number }>>(monthlySalesData);

  useEffect(() => {
    getMonthlySalesChart()
      .then((res) => {
        if (res?.data) {
          setData(res.data);
        }
      })
      .catch(() => {
        // Fallback to mock data on error
      });
  }, []);

  const maxSales = Math.max(...data.map((d) => d.sales), 1);
  const useMillions = maxSales >= 1000000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Sales</CardTitle>
        <CardDescription>Revenue by month (KES)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(v) => useMillions ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: number) => [formatCurrency(value), "Sales"]}
            />
            <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SalesTrendChart() {
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; sales: number }>>(monthlySalesData);

  useEffect(() => {
    getMonthlySalesChart()
      .then((res) => {
        if (res?.data) {
          setMonthlyData(res.data);
        }
      })
      .catch(() => {
        // Fallback to mock data on error
      });
  }, []);

  const maxMonthlySales = Math.max(...monthlyData.map((d) => d.sales), 1);
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
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailySalesData}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
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
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="monthly" className="mt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => useMillions ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number) => [formatCurrency(value), "Sales"]}
                />
                <Bar dataKey="sales" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export function PaymentMethodChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment Methods</CardTitle>
        <CardDescription>Distribution by payment type</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={paymentMethodData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={4}
              dataKey="value"
              label={({ name, value }) => `${name} ${value}%`}
            >
              {paymentMethodData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}%`, "Share"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TopProductsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Selling Products</CardTitle>
        <CardDescription>By units sold this month</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topSellingProducts} layout="vertical">
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
      </CardContent>
    </Card>
  );
}

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
            <YAxis
              yAxisId="left"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
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
              stroke="#2563EB"
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
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
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
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563EB"
              fill="url(#revenueGrad)"
              name="Revenue"
            />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#16A34A"
              fill="url(#profitGrad)"
              name="Profit"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Keep the original components for backward compatibility, but export the new combined one
export { DailySalesChart, MonthlySalesChart };
