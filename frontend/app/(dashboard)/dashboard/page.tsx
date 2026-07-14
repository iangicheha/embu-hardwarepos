"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Warehouse,
  AlertTriangle,
  XCircle,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import {
  SalesTrendChart,
  PaymentMethodChart,
  TopProductsChart,
} from "@/components/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardSummary, getOrders, getRestocks, getLowStockProducts } from "@/lib/api";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

// Backend Order.status is an enum (`COMPLETED`/`REFUNDED`/`CANCELLED`).
const orderStatusLabel: Record<string, string> = {
  COMPLETED: "Completed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

const orderStatusVariant: Record<string, "success" | "warning" | "danger"> = {
  COMPLETED: "success",
  REFUNDED: "warning",
  CANCELLED: "danger",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [restocks, setRestocks] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getDashboardSummary().catch(() => null),
      getOrders(1, 5).catch(() => null),
      getRestocks(1, 5).catch(() => null),
      getLowStockProducts().catch(() => null)
    ]).then(([summaryRes, ordersRes, restocksRes, lowStockRes]) => {
      setSummary(summaryRes?.data ?? null);
      setOrders(ordersRes?.data?.orders ?? []);
      setRestocks(restocksRes?.data?.restocks ?? []);
      setLowStockProducts(Array.isArray(lowStockRes?.data) ? lowStockRes.data : []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s what&apos;s happening at BuildMart today.
        </p>
      </div>

      {/* Revenue Cluster */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Revenue Overview</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            title="Today's Revenue"
            value={formatCurrency(summary?.todayRevenue)}
            trend={summary?.todayTrend ?? 0}
            description="vs yesterday"
            icon={DollarSign}
            index={0}
          />
          <KpiCard
            title="Weekly Revenue"
            value={formatCurrency(summary?.weeklyRevenue)}
            trend={summary?.weeklyTrend ?? 0}
            description="vs last week"
            icon={Calendar}
            index={1}
          />
          <KpiCard
            title="Monthly Revenue"
            value={formatCurrency(summary?.monthlyRevenue)}
            trend={summary?.monthlyTrend ?? 0}
            description="vs last month"
            icon={CalendarDays}
            index={2}
          />
        </div>
      </div>

      {/* Inventory Cluster */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Inventory Status</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          <KpiCard
            title="Total Products"
            value={toNumber(summary?.totalProducts).toString()}
            trend={summary?.productsTrend ?? 0}
            description="in catalog"
            icon={Package}
            index={3}
          />
          <KpiCard
            title="Inventory Value"
            value={formatCurrency(summary?.inventoryValue)}
            trend={summary?.inventoryTrend ?? 0}
            description="total stock value"
            icon={Warehouse}
            index={4}
          />
          <KpiCard
            title="Low Stock Items"
            value={toNumber(summary?.lowStockItems).toString()}
            trend={summary?.lowStockTrend ?? 0}
            description="need restocking"
            icon={AlertTriangle}
            index={5}
          />
          <KpiCard
            title="Out of Stock"
            value={toNumber(summary?.outOfStockItems).toString()}
            trend={summary?.outOfStockTrend ?? 0}
            description="unavailable items"
            icon={XCircle}
            index={6}
          />
        </div>
      </div>

      {/* Orders Cluster */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Orders</h3>
        <div className="grid gap-4 sm:grid-cols-1">
          <KpiCard
            title="Total Orders"
            value={toNumber(summary?.totalOrders).toString()}
            trend={summary?.ordersTrend ?? 0}
            description="this month"
            icon={ShoppingCart}
            index={7}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesTrendChart />
        <PaymentMethodChart />
        <TopProductsChart />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="orders">Recent Orders</TabsTrigger>
              <TabsTrigger value="restocks">Recent Restocks</TabsTrigger>
              <TabsTrigger value="alerts">Low Stock Alerts</TabsTrigger>
            </TabsList>
            <TabsContent value="orders" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        No recent orders
                      </TableCell>
                    </TableRow>
                  )}
                  {orders.slice(0, 5).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={orderStatusVariant[order.status] ?? "default"}>
                          {orderStatusLabel[order.status] ?? order.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="restocks" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restocks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        No recent restocks
                      </TableCell>
                    </TableRow>
                  )}
                  {restocks.slice(0, 5).map((restock) => (
                    <TableRow key={restock.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{restock.product?.name ?? "Product"}</p>
                          <p className="text-xs text-muted-foreground">
                            {restock.supplier?.supplierName ?? "Supplier"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>+{restock.quantityAdded}</TableCell>
                      <TableCell>{formatCurrency(restock.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="alerts" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        All products are well-stocked
                      </TableCell>
                    </TableRow>
                  )}
                  {lowStockProducts.slice(0, 5).map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-sm">{product.name}</TableCell>
                      <TableCell>{product.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={product.quantity === 0 ? "danger" : "warning"}>
                          {product.quantity === 0 ? "Out of Stock" : "Low Stock"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
