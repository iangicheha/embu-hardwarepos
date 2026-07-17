"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Smartphone, Building2, Banknote, Users, Package, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPaymentMethodBreakdown, getTopSellingProducts } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface PaymentInsight {
  paymentMethod: string;
  totalAmount: number;
  orderCount: number;
}

interface TopProduct {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function SalesInsights() {
  const [paymentData, setPaymentData] = useState<PaymentInsight[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInsights() {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const [paymentRes, productsRes] = await Promise.all([
          getPaymentMethodBreakdown(
            startOfMonth.toISOString(),
            endOfMonth.toISOString()
          ),
          getTopSellingProducts(
            startOfMonth.toISOString(),
            endOfMonth.toISOString(),
            10
          ),
        ]);

        setPaymentData(paymentRes.data ?? []);
        setTopProducts(productsRes.data ?? []);
      } catch (error) {
        console.error("Failed to load insights:", error);
      } finally {
        setLoading(false);
      }
    }

    loadInsights();
  }, []);

  const paymentMethodIcons: Record<string, any> = {
    CASH: Banknote,
    MPESA: Smartphone,
    BANK_TRANSFER: Building2,
    CREDIT: CreditCard,
  };

  const paymentMethodLabels: Record<string, string> = {
    CASH: "Cash",
    MPESA: "M-Pesa",
    BANK_TRANSFER: "Bank Transfer",
    CREDIT: "Credit",
  };

  const totalRevenue = paymentData.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalOrders = paymentData.reduce((sum, p) => sum + p.orderCount, 0);

  const mostUsedPayment = paymentData.length > 0
    ? paymentData.reduce((max, p) => p.orderCount > max.orderCount ? p : max)
    : null;

  const leastUsedPayment = paymentData.length > 0
    ? paymentData.reduce((min, p) => p.orderCount < min.orderCount ? p : min)
    : null;

  const highestRevenueProduct = topProducts.length > 0
    ? topProducts.reduce((max, p) => p.revenue > max.revenue ? p : max)
    : null;

  const bestSellingProduct = topProducts.length > 0
    ? topProducts.reduce((max, p) => p.quantity > max.quantity ? p : max)
    : null;

  const lowestSellingProduct = topProducts.length > 0
    ? topProducts.reduce((min, p) => p.quantity < min.quantity ? p : min)
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Sales Insights</h3>
          <p className="text-sm text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Sales Insights</h3>
        <p className="text-sm text-muted-foreground">
          Payment analysis and business performance metrics
        </p>
      </div>

      {/* Payment Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {paymentData.map((payment) => {
              const Icon = paymentMethodIcons[payment.paymentMethod] || CreditCard;
              const percentage = totalRevenue > 0
                ? (payment.totalAmount / totalRevenue) * 100
                : 0;

              return (
                <div
                  key={payment.paymentMethod}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {paymentMethodLabels[payment.paymentMethod]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.orderCount} transactions
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatCurrency(payment.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-2">
            {mostUsedPayment && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Most Used:</span>
                <span className="font-medium">
                  {paymentMethodLabels[mostUsedPayment.paymentMethod]} ({mostUsedPayment.orderCount} orders)
                </span>
              </div>
            )}
            {leastUsedPayment && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">Least Used:</span>
                <span className="font-medium">
                  {paymentMethodLabels[leastUsedPayment.paymentMethod]} ({leastUsedPayment.orderCount} orders)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Business Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {bestSellingProduct && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Best Selling Product
                  </span>
                </div>
                <p className="text-lg font-bold">{bestSellingProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {bestSellingProduct.quantity} units sold
                </p>
              </div>
            )}

            {highestRevenueProduct && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Highest Revenue Product
                  </span>
                </div>
                <p className="text-lg font-bold">{highestRevenueProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(highestRevenueProduct.revenue)}
                </p>
              </div>
            )}

            {lowestSellingProduct && (
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Lowest Selling Product
                  </span>
                </div>
                <p className="text-lg font-bold">{lowestSellingProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  {lowestSellingProduct.quantity} units sold
                </p>
              </div>
            )}

            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Total Transactions
                </span>
              </div>
              <p className="text-lg font-bold">{totalOrders}</p>
              <p className="text-sm text-muted-foreground">
                This month
              </p>
            </div>
          </div>

          {/* Top Products List */}
          <div className="mt-6">
            <h4 className="text-sm font-semibold mb-3">Top 10 Products This Month</h4>
            <div className="space-y-2">
              {topProducts.map((product, index) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <span className="text-sm font-medium">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(product.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
