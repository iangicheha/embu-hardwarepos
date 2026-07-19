"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Warehouse,
  Loader2,
  Search,
  FileSpreadsheet,
  BarChart3,
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
import { getDashboardSummary, getSuppliers, getProducts, getSalesReport, exportSalesCsv } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/utils";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [periodOrders, setPeriodOrders] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Order lookup (paste an order number from the Dashboard's Recent Orders)
  const [orderNumberInput, setOrderNumberInput] = useState("");
  const [lookedUpOrder, setLookedUpOrder] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Nothing renders below the filters until the manager actually asks for it.
  const [showTrends, setShowTrends] = useState(false);

  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    setDateFrom(startDate.toISOString().split("T")[0]);
    setDateTo(endDate.toISOString().split("T")[0]);
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
          getSalesReport(dateFrom, dateTo).catch(() => ({ data: [] })),
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

  // Filters actually apply now — supplier/product/payment method narrow the
  // order list that everything else (totals, charts, products-sold) is
  // computed from.
  const filteredOrders = useMemo(() => {
    return periodOrders.filter((order) => {
      const matchesPayment =
        paymentFilter === "all" || order.paymentMethod === paymentFilter;

      const items = order.items ?? [];
      const matchesSupplier =
        supplierFilter === "all" ||
        items.some((item: any) => item.product?.supplierId === supplierFilter);

      const matchesProduct =
        productFilter === "all" ||
        items.some((item: any) => item.product?.id === productFilter);

      return matchesPayment && matchesSupplier && matchesProduct;
    });
  }, [periodOrders, supplierFilter, productFilter, paymentFilter]);

  const periodTotals = useMemo(() => {
    const revenue = filteredOrders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0);
    const cost = filteredOrders.reduce((sum, order) => {
      const itemsCost = (order.items ?? []).reduce(
        (s: number, item: any) =>
          s + toNumber(item.product?.buyingPrice) * toNumber(item.quantity),
        0
      );
      return sum + itemsCost;
    }, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, profit, margin, orderCount: filteredOrders.length };
  }, [filteredOrders]);

  const inventoryValue = useMemo(
    () => products.reduce((sum, p) => sum + toNumber(p.quantity) * toNumber(p.sellingPrice), 0),
    [products]
  );

  function handleOrderLookup() {
    setLookupError(null);
    const q = orderNumberInput.trim().toLowerCase();
    if (!q) {
      setLookedUpOrder(null);
      return;
    }
    // Search within the loaded period first (fast path, no extra request).
    const found = periodOrders.find(
      (o) => o.orderNumber?.toLowerCase() === q
    );
    if (found) {
      setLookedUpOrder(found);
    } else {
      setLookedUpOrder(null);
      setLookupError(
        "No order found with that number in the current date range — try widening Date From / Date To above."
      );
    }
  }

  async function handleExportCsv() {
    try {
      const csv = await exportSalesCsv(dateFrom, dateTo);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
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
          <p className="text-muted-foreground">Look up a sale, or generate trends for a period.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <FileSpreadsheet className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">{error}</div>
      )}

      {/* ORDER LOOKUP — paste an order number from the Dashboard's Recent
          Orders table, see exactly what was in that sale. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Find an Order</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paste an order number from the Dashboard&apos;s Recent Orders to see the products in that sale.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g. ORD-2026-0042"
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOrderLookup()}
              className="max-w-xs"
            />
            <Button onClick={handleOrderLookup}>
              <Search className="mr-1 h-4 w-4" />
              Find
            </Button>
          </div>

          {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}

          {lookedUpOrder && (
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3">
                <div>
                  <p className="font-medium">{lookedUpOrder.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {lookedUpOrder.createdAt
                      ? new Date(lookedUpOrder.createdAt).toLocaleString()
                      : "—"}{" "}
                    · {lookedUpOrder.paymentMethod ?? "—"}
                  </p>
                </div>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(lookedUpOrder.totalAmount)}
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(lookedUpOrder.items ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-4">
                        No line item detail available for this order.
                      </TableCell>
                    </TableRow>
                  )}
                  {(lookedUpOrder.items ?? []).map((item: any, idx: number) => {
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
          )}
        </CardContent>
      </Card>

      {/* FILTERS — functional: narrow the date range and, within it, by
          supplier / product / payment method. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-2">
              <Label>Date From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Date To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Supplier</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
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
              <Select value={productFilter} onValueChange={setProductFilter}>
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
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
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

          <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-4 text-sm">
            <span className="text-muted-foreground">
              {periodTotals.orderCount} order{periodTotals.orderCount === 1 ? "" : "s"} match these filters
            </span>
            <span className="font-medium">{formatCurrency(periodTotals.revenue)} revenue</span>
            <Button size="sm" onClick={() => setShowTrends(true)}>
              <BarChart3 className="mr-1 h-4 w-4" />
              Generate Trends
            </Button>
            {showTrends && (
              <Button size="sm" variant="outline" onClick={() => setShowTrends(false)}>
                Hide Trends
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Everything below only appears once the manager asks for it. */}
      {showTrends && (
        <>
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
        </>
      )}
    </div>
  );
}