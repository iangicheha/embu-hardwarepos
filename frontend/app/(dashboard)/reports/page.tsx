"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Warehouse,
  Loader2,
} from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import {
  RevenueTrendChart,
  TopProductsChart,
  PaymentMethodChart,
} from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileSpreadsheet } from "lucide-react";
import { getDashboardSummary, getSuppliers, getProducts, getSalesReport, exportSalesCsv } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/utils";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [periodOrders, setPeriodOrders] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    setDateFrom(startDate.toISOString().split('T')[0]);
    setDateTo(endDate.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!dateFrom || !dateTo) return;

      try {
        setLoading(true);
        const [summaryRes, suppliersRes, productsRes, salesRes] = await Promise.all([
          getDashboardSummary(),
          getSuppliers(1, 100),
          getProducts(1, 100),
          getSalesReport(dateFrom, dateTo).catch(() => ({ data: [] }))
        ]);

        setSummary(summaryRes.data);
        setSuppliers(suppliersRes.data?.suppliers ?? []);
        setProducts(productsRes.data?.products ?? []);
        setPeriodOrders(Array.isArray(salesRes?.data) ? salesRes.data : []);
      } catch (err) {
        setError("Failed to load reports");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateFrom, dateTo]);

  // Compute period totals from the actual orders list — backend's
  // `dashboardSummary` doesn't expose `totalRevenue`/`totalProfit`.
  const periodTotals = useMemo(() => {
    const revenue = periodOrders.reduce(
      (sum, o) => sum + toNumber(o.totalAmount),
      0
    );
    const cost = periodOrders.reduce((sum, order) => {
      const itemsCost = (order.items ?? []).reduce(
        (s: number, item: any) =>
          s + toNumber(item.product?.buyingPrice) * toNumber(item.quantity),
        0
      );
      return sum + itemsCost;
    }, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, profit, margin, orderCount: periodOrders.length };
  }, [periodOrders]);

  const inventoryValue = useMemo(
    () =>
      products.reduce(
        (sum, p) => sum + toNumber(p.quantity) * toNumber(p.sellingPrice),
        0
      ),
    [products]
  );

  // What actually sold in the selected date range, aggregated per product —
  // this is what a manager asks for: "what did we sell this month", not
  // just the revenue total. Built from each order's line items.
  const productsSold = useMemo(() => {
    const byProduct = new Map<
      string,
      { name: string; code: string; qtySold: number; revenue: number }
    >();

    for (const order of periodOrders) {
      for (const item of order.items ?? []) {
        const product = item.product;
        if (!product) continue;
        const key = product.id ?? product.productCode ?? product.name;
        const qty = toNumber(item.quantity);
        const lineRevenue = toNumber(item.price ?? product.sellingPrice) * qty;

        const existing = byProduct.get(key);
        if (existing) {
          existing.qtySold += qty;
          existing.revenue += lineRevenue;
        } else {
          byProduct.set(key, {
            name: product.name ?? "Unknown product",
            code: product.productCode ?? "—",
            qtySold: qty,
            revenue: lineRevenue,
          });
        }
      }
    }

    return Array.from(byProduct.values()).sort((a, b) => b.qtySold - a.qtySold);
  }, [periodOrders]);

  async function handleExportCsv() {
    try {
      const csv = await exportSalesCsv(dateFrom, dateTo);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${dateFrom}-${dateTo}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to export CSV");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Analytics and business intelligence dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Supplier</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplierName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Product</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(periodTotals.revenue || summary?.totalRevenue)}
          trend={periodTotals.margin}
          description="this period"
          icon={DollarSign}
        />
        <KpiCard
          title="Total Profit"
          value={formatCurrency(periodTotals.profit || summary?.totalProfit)}
          trend={periodTotals.margin}
          description={`${periodTotals.margin.toFixed(1)}% margin`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Total Orders"
          value={toNumber(periodTotals.orderCount || summary?.totalOrders).toString()}
          trend={0}
          description="this period"
          icon={ShoppingCart}
        />
        <KpiCard
          title="Inventory Value"
          value={formatCurrency(inventoryValue || summary?.inventoryValue)}
          trend={0}
          description="current stock"
          icon={Warehouse}
        />
      </div>

      <RevenueTrendChart />

      <div className="grid gap-4 lg:grid-cols-2">
        <TopProductsChart />
        <PaymentMethodChart />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Products Sold</CardTitle>
          <p className="text-sm text-muted-foreground">
            Every product sold between {dateFrom} and {dateTo}, aggregated across all orders in the period.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsSold.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    No products sold in this period.
                  </TableCell>
                </TableRow>
              )}
              {productsSold.map((p) => (
                <TableRow key={p.code + p.name}>
                  <TableCell className="font-medium text-sm">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.code}</TableCell>
                  <TableCell className="text-right">{p.qtySold}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(p.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders in Period</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click an order to see exactly which products were sold in that sale.
          </p>
        </CardHeader>
        <CardContent>
          <OrdersWithLineItems orders={periodOrders} />
        </CardContent>
      </Card>
    </div>
  );
}

// Expandable per-order table — click a row to reveal its line items (the
// individual products + quantities that made up that specific sale).
function OrdersWithLineItems({ orders }: { orders: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (orders.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-6">No orders in this period.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const isExpanded = expandedId === order.id;
          return (
            <>
              <TableRow
                key={order.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(order.totalAmount)}
                </TableCell>
              </TableRow>
              {isExpanded && (
                <TableRow key={`${order.id}-items`}>
                  <TableCell colSpan={3} className="bg-muted/30 p-0">
                    <div className="p-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8 text-xs">Product</TableHead>
                            <TableHead className="h-8 text-xs text-right">Qty</TableHead>
                            <TableHead className="h-8 text-xs text-right">Unit Price</TableHead>
                            <TableHead className="h-8 text-xs text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(order.items ?? []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-3">
                                No line item detail available for this order.
                              </TableCell>
                            </TableRow>
                          )}
                          {(order.items ?? []).map((item: any, idx: number) => {
                            const unitPrice = toNumber(item.price ?? item.product?.sellingPrice);
                            const qty = toNumber(item.quantity);
                            return (
                              <TableRow key={item.id ?? idx}>
                                <TableCell className="text-sm">{item.product?.name ?? "Unknown product"}</TableCell>
                                <TableCell className="text-right text-sm">{qty}</TableCell>
                                <TableCell className="text-right text-sm">{formatCurrency(unitPrice)}</TableCell>
                                <TableCell className="text-right text-sm font-medium">
                                  {formatCurrency(unitPrice * qty)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}