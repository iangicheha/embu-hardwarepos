import { Prisma } from "@prisma/client";
import prisma from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";

const completedOrdersFilter = {
  status: "COMPLETED" as const
};

class ReportsService {
  async dashboardSummary() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(startOfDay);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const lastMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );

    const lastMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0
    );

    const revenueFilter = (since: Date) => ({
      ...completedOrdersFilter,
      createdAt: { gte: since }
    });

    // lowStockCount uses raw SQL since Prisma can't compare two columns
    const lowStockCountResult = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM "products" WHERE "quantity" <= "reorderLevel" AND "quantity" > 0`;

    const lowStockCount = Number(lowStockCountResult[0]?.count ?? 0);

    // outOfStockCount uses raw SQL to count products with quantity = 0
    const outOfStockCountResult = await prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(*)::bigint AS count FROM "products" WHERE "quantity" = 0`;

    const outOfStockCount = Number(outOfStockCountResult[0]?.count ?? 0);

    // Calculate inventory value (sum of buyingPrice * quantity for all products)
    const inventoryValueResult = await prisma.product.aggregate({
      _sum: { buyingPrice: true, quantity: true }
    });

    // We need to calculate inventory value as sum of (buyingPrice * quantity) for each product
    const products = await prisma.product.findMany({
      select: { buyingPrice: true, quantity: true }
    });

    const inventoryValue = products.reduce(
      (sum, p) => sum + Number(p.buyingPrice) * Number(p.quantity),
      0
    );

    const [
      todayRevenue,
      yesterdayRevenue,
      weeklyRevenue,
      lastWeekRevenue,
      monthlyRevenue,
      lastMonthRevenue,
      totalOrders,
      lastMonthOrders,
      totalProducts,
      lastMonthProducts,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: revenueFilter(startOfDay),
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: revenueFilter(yesterdayStart),
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: revenueFilter(weekStart),
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: revenueFilter(lastWeekStart),
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: revenueFilter(monthStart),
        _sum: { totalAmount: true }
      }),
      prisma.order.aggregate({
        where: {
          ...completedOrdersFilter,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
        },
        _sum: { totalAmount: true }
      }),
      prisma.order.count({ where: completedOrdersFilter }),
      prisma.order.count({
        where: {
          ...completedOrdersFilter,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
        }
      }),
      prisma.product.count(),
      prisma.product.count({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
      }),
    ]);

    const todayRevenueValue = Number(todayRevenue._sum.totalAmount ?? 0);
    const yesterdayRevenueValue = Number(yesterdayRevenue._sum.totalAmount ?? 0);
    const weeklyRevenueValue = Number(weeklyRevenue._sum.totalAmount ?? 0);
    const lastWeekRevenueValue = Number(lastWeekRevenue._sum.totalAmount ?? 0);
    const monthlyRevenueValue = Number(monthlyRevenue._sum.totalAmount ?? 0);
    const lastMonthRevenueValue = Number(lastMonthRevenue._sum.totalAmount ?? 0);

    // Calculate trends (percentage change)
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const todayTrend = calculateTrend(todayRevenueValue, yesterdayRevenueValue);
    const weeklyTrend = calculateTrend(weeklyRevenueValue, lastWeekRevenueValue);
    const monthlyTrend = calculateTrend(monthlyRevenueValue, lastMonthRevenueValue);
    const ordersTrend = calculateTrend(totalOrders, lastMonthOrders);
    const productsTrend = calculateTrend(totalProducts, lastMonthProducts);

    // For inventory and stock metrics, we'll use 0 for now since historical tracking would require additional tables
    const inventoryTrend = 0;
    const lowStockTrend = 0;
    const outOfStockTrend = 0;

    return {
      todayRevenue: todayRevenueValue,
      weeklyRevenue: weeklyRevenueValue,
      monthlyRevenue: monthlyRevenueValue,
      totalOrders,
      totalProducts,
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      inventoryValue,
      todayTrend,
      weeklyTrend,
      monthlyTrend,
      ordersTrend,
      productsTrend,
      inventoryTrend,
      lowStockTrend,
      outOfStockTrend,
    };
  }

  async salesReport(startDate: Date, endDate: Date) {
    return prisma.order.findMany({
      where: {
        ...completedOrdersFilter,
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        items: { include: { product: true } },
        createdBy: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async inventoryReport() {
    return prisma.product.findMany({
      include: { supplier: true, category: true },
      orderBy: { name: "asc" }
    });
  }

  async profitReport(startDate: Date, endDate: Date) {
    const orders = await prisma.order.findMany({
      where: {
        ...completedOrdersFilter,
        createdAt: { gte: startDate, lte: endDate }
      },
      include: { items: { include: { product: true } } }
    });

    let revenue = 0;
    let cost = 0;

    for (const order of orders) {
      revenue += Number(order.totalAmount);
      for (const item of order.items) {
        cost += Number(item.product.buyingPrice) * item.quantity;
      }
    }

    const profit = revenue - cost;
    return {
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      orderCount: orders.length
    };
  }

  async topSellingProducts(
    startDate: Date,
    endDate: Date,
    limit = 10
  ) {
    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          ...completedOrdersFilter,
          createdAt: { gte: startDate, lte: endDate }
        }
      },
      include: { product: true }
    });

    const totals = new Map<
      string,
      {
        productId: string;
        name: string;
        quantity: number;
        revenue: number;
      }
    >();

    for (const item of items) {
      const existing = totals.get(item.productId) ?? {
        productId: item.productId,
        name: item.product.name,
        quantity: 0,
        revenue: 0
      };
      existing.quantity += item.quantity;
      existing.revenue += Number(item.total);
      totals.set(item.productId, existing);
    }

    return [...totals.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  async paymentMethodBreakdown(startDate: Date, endDate: Date) {
    const groups = await prisma.order.groupBy({
      by: ["paymentMethod"],
      where: {
        ...completedOrdersFilter,
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { totalAmount: true },
      _count: { _all: true }
    });

    return groups.map((row) => ({
      paymentMethod: row.paymentMethod,
      totalAmount: Number(row._sum.totalAmount ?? 0),
      orderCount: row._count._all
    }));
  }

  async restockCostReport(startDate: Date, endDate: Date) {
    const restocks = await prisma.restock.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        product: true,
        supplier: true,
        receivedBy: true
      },
      orderBy: { createdAt: "desc" }
    });

    const totalCost = restocks.reduce(
      (sum, r) => sum + Number(r.cost),
      0
    );

    return { restocks, totalCost, count: restocks.length };
  }

  async monthlySalesChart() {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        ...completedOrdersFilter,
        createdAt: { gte: yearStart, lte: yearEnd }
      },
      select: {
        totalAmount: true,
        createdAt: true
      }
    });

    // Initialize monthly data
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(now.getFullYear(), i, 1).toLocaleString('default', { month: 'short' }),
      sales: 0
    }));

    // Aggregate sales by month
    for (const order of orders) {
      const monthIndex = order.createdAt.getMonth();
      monthlyData[monthIndex].sales += Number(order.totalAmount);
    }

    return monthlyData;
  }

  async exportSalesCsv(startDate: Date, endDate: Date) {
    const orders = await this.salesReport(startDate, endDate);

    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n\r]/.test(s)
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header =
      "Order Number,Date,Customer,Payment Method,Total,Status\n";

    const rows = orders
      .map(
        (order) =>
          [
            escape(order.orderNumber),
            escape(order.createdAt.toISOString()),
            escape(order.customerName ?? ""),
            escape(order.paymentMethod),
            escape(order.totalAmount),
            escape(order.status)
          ].join(",")
      )
      .join("\n");

    return header + rows;
  }
}

export default new ReportsService();

// silence unused-import warning; Prisma kept for future typed reports
void ({} as Prisma.InputJsonValue);
void AppError;
