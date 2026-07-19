"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Warehouse,
  Loader2,
  Search,
  FileSpreadsheet,
  BarChart3,
  Receipt,
  PackagePlus,
} from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { getDashboardSummary, getSuppliers, getProducts, getSalesReport, getRestocks } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/utils";

const PIE_COLORS = ["#dc2626", "#16a34a", "#f59e0b", "#2563eb"];

type ReportType = "all" | "orders" | "restocks";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [periodOrders, setPeriodOrders] = useState<any[]>([]);
  const [periodRestocks, setPeriodRestocks] = useState<any[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [reportType, setReportType] = useState<ReportType>("all");

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
        const [summaryRes, suppliersRes, productsRes, salesRes, restocksRes] = await Promise.all([
          getDashboardSummary(),
          getSuppliers(1, 100),
          getProducts(1, 100),
          getSalesReport(dateFrom, dateTo).catch(() => ({ data: [] })),
          getRestocks(1, 100).catch(() => ({ data: { restocks: [] } })),
        ]);

        setSummary(summaryRes.data);
        setSuppliers(suppliersRes.data?.suppliers ?? []);
        setProducts(productsRes.data?.products ?? []);
        setPeriodOrders(Array.isArray(salesRes?.data) ? salesRes.data : []);

        // getRestocks isn't date-filterable server-side — filter client-side
        // to the same window as the orders so the two tables line up.
        const allRestocks = restocksRes.data?.restocks ?? [];
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        setPeriodRestocks(
          allRestocks.filter((r: any) => {
            if (!r.createdAt) return false;
            const d = new Date(r.createdAt);
            return d >= from && d <= to;
          })
        );
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

  // Restocks in the filtered period, respecting the reportType toggle too
  // (used by both the P&L below and the Restocks table/export).
  const visibleRestocks = reportType === "orders" ? [] : periodRestocks;
  const visibleOrders = reportType === "restocks" ? [] : filteredOrders;

  // Full profit & loss: sales revenue minus cost of goods sold (from what
  // was actually sold) minus what was spent restocking in the same window.
  // This is the number a manager actually wants — not just "revenue".
  const periodTotals = useMemo(() => {
    const revenue = visibleOrders.reduce((sum, o) => sum + toNumber(o.totalAmount), 0);
    const cogs = visibleOrders.reduce((sum, order) => {
      const itemsCost = (order.items ?? []).reduce(
        (s: number, item: any) =>
          s + toNumber(item.product?.buyingPrice) * toNumber(item.quantity),
        0
      );
      return sum + itemsCost;
    }, 0);
    const restockSpend = visibleRestocks.reduce((sum, r) => sum + toNumber(r.cost), 0);

    const grossProfit = revenue - cogs;
    const netProfit = grossProfit; // restock spend is capital converted to stock, not an expense against this period's sales — shown separately below, not subtracted from profit.
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    return {
      revenue,
      cogs,
      grossProfit,
      netProfit,
      restockSpend,
      margin,
      orderCount: visibleOrders.length,
      isProfit: netProfit >= 0,
    };
  }, [visibleOrders, visibleRestocks]);

  const inventoryValue = useMemo(
    () => products.reduce((sum, p) => sum + toNumber(p.quantity) * toNumber(p.sellingPrice), 0),
    [products]
  );

  // Chart data built directly from the SAME filtered/report-type-scoped data
  // as the tables above, so what the chart shows always matches what's on
  // screen — no separate, possibly-unfiltered fetch inside a chart component.
  const revenueByDay = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const o of visibleOrders) {
      if (!o.createdAt) continue;
      const day = new Date(o.createdAt).toLocaleDateString("en-CA"); // YYYY-MM-DD, sorts naturally
      byDay.set(day, (byDay.get(day) ?? 0) + toNumber(o.totalAmount));
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }, [visibleOrders]);

  const topProductsData = useMemo(() => {
    const byProduct = new Map<string, { name: string; qty: number }>();
    for (const o of visibleOrders) {
      for (const item of o.items ?? []) {
        const name = item.product?.name ?? "Unknown";
        const qty = toNumber(item.quantity);
        const existing = byProduct.get(name);
        if (existing) existing.qty += qty;
        else byProduct.set(name, { name, qty });
      }
    }
    return Array.from(byProduct.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [visibleOrders]);

  const paymentMethodData = useMemo(() => {
    const byMethod = new Map<string, number>();
    for (const o of visibleOrders) {
      const method = o.paymentMethod ?? "Unknown";
      byMethod.set(method, (byMethod.get(method) ?? 0) + toNumber(o.totalAmount));
    }
    return Array.from(byMethod.entries()).map(([name, value]) => ({ name, value }));
  }, [visibleOrders]);

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

  async function handleExportExcel() {
    try {
      setError(null);
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      if (reportType !== "restocks") {
        const orderRows = visibleOrders.map((o) => {
          const items = o.items ?? [];
          const totalQty = items.reduce((s: number, it: any) => s + toNumber(it.quantity), 0);
          return {
            "Order Number": o.orderNumber ?? "",
            "Date": o.createdAt ? new Date(o.createdAt).toLocaleString() : "",
            "Payment Method": o.paymentMethod ?? "",
            "Items": items.map((it: any) => `${it.product?.name ?? "Unknown"} x${toNumber(it.quantity)}`).join("; "),
            "Total Quantity": totalQty,
            "Total Amount (KES)": toNumber(o.totalAmount),
          };
        });
        const ordersSheet = XLSX.utils.json_to_sheet(orderRows);
        ordersSheet["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 45 }, { wch: 12 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(workbook, ordersSheet, "Orders");
      }

      if (reportType !== "orders") {
        const restockRows = visibleRestocks.map((r) => ({
          "Product": r.product?.name ?? "",
          "Supplier": r.supplier?.supplierName ?? "",
          "Date": r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
          "Quantity Added": toNumber(r.quantityAdded),
          "Cost (KES)": toNumber(r.cost),
        }));
        const restocksSheet = XLSX.utils.json_to_sheet(restockRows);
        restocksSheet["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 14 }];
        XLSX.utils.book_append_sheet(workbook, restocksSheet, "Restocks");
      }

      // Summary sheet always included — the P&L snapshot for this export.
      const summaryRows = [
        { "Metric": "Report period", "Value": `${dateFrom} to ${dateTo}` },
        { "Metric": "Report type", "Value": reportType === "all" ? "Orders & Restocks" : reportType === "orders" ? "Orders only" : "Restocks only" },
        { "Metric": "Total Revenue (KES)", "Value": periodTotals.revenue },
        { "Metric": "Cost of Goods Sold (KES)", "Value": periodTotals.cogs },
        { "Metric": "Gross Profit / Loss (KES)", "Value": periodTotals.netProfit },
        { "Metric": "Result", "Value": periodTotals.isProfit ? "PROFIT" : "LOSS" },
        { "Metric": "Margin (%)", "Value": periodTotals.margin.toFixed(1) },
        { "Metric": "Restock Spend (KES)", "Value": periodTotals.restockSpend },
        { "Metric": "Order Count", "Value": periodTotals.orderCount },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet["!cols"] = [{ wch: 26 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      XLSX.writeFile(workbook, `report-${reportType}-${dateFrom}-${dateTo}.xlsx`);
    } catch (err: any) {
      setError(err.message || "Failed to export Excel file");
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
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-1 h-4 w-4" />
          Export Excel
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="grid gap-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Orders &amp; Restocks</SelectItem>
                  <SelectItem value="orders">Orders only</SelectItem>
                  <SelectItem value="restocks">Restocks only</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

      {/* PROFIT & LOSS — the headline number a manager actually wants.
          Green card + up arrow when in profit, red card + down arrow when
          in loss, so the result is unmistakable at a glance. */}
      <Card className={periodTotals.isProfit ? "border-l-4 border-l-success" : "border-l-4 border-l-danger"}>
        <CardHeader>
          <div className="flex items-center gap-2">
            {periodTotals.isProfit ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-danger" />
            )}
            <CardTitle className="text-base">
              Profit &amp; Loss —{" "}
              <span className={periodTotals.isProfit ? "text-success" : "text-danger"}>
                {periodTotals.isProfit ? "PROFIT" : "LOSS"}
              </span>
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {dateFrom} to {dateTo}
            {reportType !== "all" && ` · ${reportType === "orders" ? "Orders only" : "Restocks only"}`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold">{formatCurrency(periodTotals.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cost of Goods Sold</p>
              <p className="text-lg font-bold">{formatCurrency(periodTotals.cogs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Restock Spend</p>
              <p className="text-lg font-bold">{formatCurrency(periodTotals.restockSpend)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Net Result</p>
              <p className={`text-lg font-bold ${periodTotals.isProfit ? "text-success" : "text-danger"}`}>
                {periodTotals.isProfit ? "+" : ""}
                {formatCurrency(periodTotals.netProfit)}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  ({periodTotals.margin.toFixed(1)}% margin)
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ORDERS — every sale in the filtered period. Red accent = money out
          the door (a sale). Hidden entirely when Report Type = Restocks only. */}
      {reportType !== "restocks" && (
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Orders</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {visibleOrders.length} order{visibleOrders.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Sales made in the filtered period.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    No orders match these filters.
                  </TableCell>
                </TableRow>
              )}
              {visibleOrders.map((order) => {
                const totalQty = (order.items ?? []).reduce(
                  (s: number, it: any) => s + toNumber(it.quantity),
                  0
                );
                return (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setOrderNumberInput(order.orderNumber ?? "");
                      setLookedUpOrder(order);
                      setLookupError(null);
                    }}
                  >
                    <TableCell className="font-medium text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{order.paymentMethod ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm">{totalQty}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* RESTOCKS — stock coming IN from suppliers. Deliberately different
          accent color + icon so it's never confused with the Orders table
          above (opposite direction of goods/money). Hidden when Report Type
          = Orders only. */}
      {reportType !== "orders" && (
      <Card className="border-l-4 border-l-success">
        <CardHeader>
          <div className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-success" />
            <CardTitle className="text-base">Restocks</CardTitle>
            <Badge variant="secondary" className="ml-auto">
              {visibleRestocks.length} restock{visibleRestocks.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Stock received from suppliers in the filtered period.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Qty Added</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRestocks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                    No restocks in this period.
                  </TableCell>
                </TableRow>
              )}
              {visibleRestocks.map((restock) => (
                <TableRow key={restock.id}>
                  <TableCell className="font-medium text-sm">{restock.product?.name ?? "Product"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {restock.supplier?.supplierName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {restock.createdAt ? new Date(restock.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-success">
                    +{restock.quantityAdded}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(restock.cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Everything below only appears once the manager asks for it. */}
      {showTrends && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Revenue"
              value={formatCurrency(periodTotals.revenue)}
              trend={periodTotals.margin}
              description="this period"
              icon={DollarSign}
            />
            <KpiCard
              title={periodTotals.isProfit ? "Total Profit" : "Total Loss"}
              value={formatCurrency(Math.abs(periodTotals.netProfit))}
              trend={periodTotals.margin}
              description={`${periodTotals.margin.toFixed(1)}% margin`}
              icon={periodTotals.isProfit ? TrendingUp : TrendingDown}
            />
            <KpiCard
              title="Total Orders"
              value={toNumber(periodTotals.orderCount).toString()}
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

          {reportType !== "restocks" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <p className="text-sm text-muted-foreground">Daily revenue for the filtered orders.</p>
              </CardHeader>
              <CardContent>
                {revenueByDay.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No sales data in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={revenueByDay}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} width={90} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {reportType !== "restocks" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Products (by Qty Sold)</CardTitle>
                </CardHeader>
                <CardContent>
                  {topProductsData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No sales data in this period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={topProductsData} layout="vertical" margin={{ left: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" fontSize={12} />
                        <YAxis dataKey="name" type="category" width={140} fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="qty" fill="#dc2626" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue by Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentMethodData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No sales data in this period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={paymentMethodData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                        >
                          {paymentMethodData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}