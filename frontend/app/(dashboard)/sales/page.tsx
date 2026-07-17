"use client";

import { useEffect, useState } from "react";
import { Search, Download, FileSpreadsheet, FileText, Filter, Calendar } from "lucide-react";
import { getOrders, downloadReceipt } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SalesInsights } from "@/components/sales/sales-insights";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  MPESA: "M-Pesa",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT: "Credit",
};

export default function SalesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadOrders();
  }, [page, dateFilter, paymentMethodFilter]);

  async function loadOrders() {
    try {
      setLoading(true);
      const res = await getOrders(page, 20);
      setOrders(res.data?.orders ?? []);
      setTotalPages(res.data?.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error("Failed to load orders:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter((order) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      order.orderNumber.toLowerCase().includes(q) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      order.items.some((item: any) =>
        item.product.name.toLowerCase().includes(q)
      );

    const matchesPayment =
      paymentMethodFilter === "all" ||
      order.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesPayment;
  });

  async function handleExportCsv() {
    try {
      const csvContent = [
        [
          "Order Number",
          "Receipt Number",
          "Customer",
          "Items",
          "Quantity",
          "Payment Method",
          "Amount",
          "Date",
          "Cashier",
        ].join(","),
        ...filteredOrders.map((order) =>
          [
            order.orderNumber,
            order.receiptNumber,
            order.customerName || "Walk-in",
            order.items.map((i: any) => i.product.name).join("; "),
            order.items.reduce((sum: number, i: any) => sum + i.quantity, 0),
            paymentMethodLabels[order.paymentMethod],
            order.totalAmount,
            formatDate(order.createdAt),
            order.createdBy?.fullName || "N/A",
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export CSV:", error);
    }
  }

  async function handleExportPdf(orderId: string) {
    try {
      const blob = await downloadReceipt(orderId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading sales data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sales</h2>
        <p className="text-muted-foreground">
          View and manage all sales transactions
        </p>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales">Sales Table</TabsTrigger>
          <TabsTrigger value="insights">Sales Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by order number, customer, or product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={paymentMethodFilter}
                onValueChange={setPaymentMethodFilter}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    No sales found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.receiptNumber}</TableCell>
                    <TableCell>
                      {order.customerName || "Walk-in Customer"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {order.items
                        .map((i: any) => i.product.name)
                        .join(", ")}
                    </TableCell>
                    <TableCell>
                      {order.items.reduce(
                        (sum: number, i: any) => sum + i.quantity,
                        0
                      )}
                    </TableCell>
                    <TableCell>
                      {paymentMethodLabels[order.paymentMethod]}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.totalAmount)}
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>{order.createdBy?.fullName || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={orderStatusVariant[order.status] ?? "default"}
                      >
                        {orderStatusLabel[order.status] ?? order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportPdf(order.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="insights">
          <SalesInsights />
        </TabsContent>
      </Tabs>
    </div>
  );
}
