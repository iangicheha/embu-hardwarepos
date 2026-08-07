import { Prisma } from "@prisma/client";
import prisma, { TransactionClient } from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";
import { calculateTotals } from "../../utils/calculateTotals";
import { generateOrderNumber } from "../../utils/generateOrderNumber";
import { generateReceiptNumber } from "../../utils/generateReceiptNumber";
import notificationService from "../../services/notification.service";
import emailService from "../../services/email.service";
import { isEmailConfigured } from "../../config/env";
import { logger } from "../../config/logger";

const orderItemInclude = {
  product: true,
  productUnit: true
} satisfies Prisma.OrderItemInclude;

const orderInclude = {
  createdBy: true,
  items: { include: orderItemInclude }
} satisfies Prisma.OrderInclude;

type RawOrderInput = {
  items: Array<{ productId: string; productUnitId: string; quantity: number }>;
  customerName?: string;
  customerEmail?: string;
  paymentMethod: "CASH" | "MPESA" | "BANK_TRANSFER" | "CREDIT";
  discount?: number;
  orderDate?: string; // ISO string; cashier-entered, defaults to now if omitted
};

// Resolved per line: the product + the specific selling unit picked,
// plus how much baseUnit stock this line actually consumes.
type ResolvedOrderItem = {
  productId: string;
  productUnitId: string;
  quantity: number;      // in the SOLD unit, e.g. 15 for "15 kg"
  unitPrice: number;     // server-trusted price, from ProductUnit — never the client's
  total: number;
  baseUnitsUsed: number;  // quantity * conversionToBase, for stock math
  productName: string;
};

class OrdersService {
  private async getTaxRate() {
    const settings = await prisma.setting.findFirst();
    return settings?.taxRate ? Number(settings.taxRate) : 0;
  }

  private async nextOrderNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateOrderNumber();
      const existing = await prisma.order.findUnique({
        where: { orderNumber: candidate },
        select: { id: true }
      });
      if (!existing) return candidate;
    }
    throw new AppError("Could not generate unique order number", 500);
  }

  private async nextReceiptNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateReceiptNumber();
      const existing = await prisma.order.findUnique({
        where: { receiptNumber: candidate },
        select: { id: true }
      });
      if (!existing) return candidate;
    }
    throw new AppError("Could not generate unique receipt number", 500);
  }

  async createOrder(payload: RawOrderInput, userId: string) {
    const rawItems = Array.isArray(payload.items) ? payload.items : [];

    if (rawItems.length === 0) {
      throw new AppError("Order must have at least one item", 400);
    }

    for (const item of rawItems) {
      if (!item.productId || !item.productUnitId) {
        throw new AppError("Each item needs a productId and productUnitId", 400);
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        throw new AppError("Each item needs a positive quantity", 400);
      }
    }

    const productIds = [...new Set(rawItems.map((i) => i.productId))];

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { sellingUnits: true }
    });

    if (products.length !== productIds.length) {
      throw new AppError("One or more products were not found", 404);
    }

    // Resolve each line against the product's real selling units — price
    // and conversion always come from the server, never trusted from the client.
    const resolvedItems: ResolvedOrderItem[] = rawItems.map((i) => {
      const product = products.find((p) => p.id === i.productId)!;
      const unit = product.sellingUnits.find((u) => u.id === i.productUnitId);
      if (!unit) {
        throw new AppError(
          `Selling unit not found for product ${product.name}`,
          400
        );
      }
      const unitPrice = Number(unit.sellingPrice);
      const conversionToBase = Number(unit.conversionToBase);
      const total = unitPrice * i.quantity;
      return {
        productId: i.productId,
        productUnitId: i.productUnitId,
        quantity: i.quantity,
        unitPrice,
        total,
        baseUnitsUsed: i.quantity * conversionToBase,
        productName: product.name
      };
    });

    // Stock check in baseUnit terms — sum up all lines against the same
    // product (e.g. 2 bags + 5 loose kg of the same cement) before comparing.
    const baseUnitsNeededByProduct = new Map<string, number>();
    for (const item of resolvedItems) {
      baseUnitsNeededByProduct.set(
        item.productId,
        (baseUnitsNeededByProduct.get(item.productId) ?? 0) + item.baseUnitsUsed
      );
    }
    for (const product of products) {
      const needed = baseUnitsNeededByProduct.get(product.id) ?? 0;
      const available = Number(product.quantity);
      if (needed > available) {
        throw new AppError(
          `Insufficient stock for ${product.name}. Available: ${available} ${product.baseUnit}, requested: ${needed} ${product.baseUnit}`,
          400
        );
      }
    }

    const subtotal = resolvedItems.reduce((sum, item) => sum + item.total, 0);

    const discount = payload.discount ? Number(payload.discount) : 0;
    // Tax intentionally not applied — selling prices are treated as final,
    // so totalWithTax should equal subtotal - discount.
    const totals = calculateTotals(subtotal, discount, 0);

    const orderNumber = await this.nextOrderNumber();
    const receiptNumber = await this.nextReceiptNumber();

    const order = await prisma.$transaction(async (tx) => {
      // Row-lock each product row so concurrent orders can't oversell.
      await Promise.all(
        productIds.map((id) =>
          tx.$queryRaw`SELECT id FROM products WHERE id = ${id} FOR UPDATE`
        )
      );

      // Re-check stock inside the lock — the earlier check was outside the
      // transaction and could be stale if two orders raced in.
      const lockedProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      for (const product of lockedProducts) {
        const needed = baseUnitsNeededByProduct.get(product.id) ?? 0;
        if (needed > Number(product.quantity)) {
          throw new AppError(
            `Insufficient stock for ${product.name}. Available: ${Number(product.quantity)} ${product.baseUnit}`,
            400
          );
        }
      }

      const created = await tx.order.create({
        data: {
          orderNumber,
          receiptNumber,
          customerName: payload.customerName ?? null,
          paymentMethod: payload.paymentMethod,
          totalAmount: totals.totalWithTax,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discount: totals.discount,
          status: "COMPLETED",
          createdById: userId,
          // Only override createdAt when the cashier actually entered a
          // date — otherwise let Prisma's schema default (now()) apply,
          // so ordinary same-day sales are untouched by this feature.
          ...(payload.orderDate ? { createdAt: new Date(payload.orderDate) } : {}),
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              productUnitId: item.productUnitId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }))
          }
        },
        include: orderInclude
      });

      await Promise.all(
        [...baseUnitsNeededByProduct.entries()].map(([productId, baseUnits]) =>
          tx.product.update({
            where: { id: productId },
            data: { quantity: { decrement: baseUnits } }
          })
        )
      );

      await tx.auditLog.create({
        data: {
          userId,
          action: "ORDER_CREATED",
          details: `Order ${created.orderNumber} created`
        }
      });

      return created;
    });

    // Best-effort post-processing, never blocks the response on failure
    Promise.allSettled([
      this.checkLowStockAfterOrder(productIds),
      notificationService
        .notifyLargeOrder(order.orderNumber, Number(order.totalAmount))
        .catch((err) => logger.error("notifyLargeOrder failed", err)),
      this.sendReceiptEmail(payload, order)
    ]).catch((err) => logger.error("post-order tasks failed", err));

    return order;
  }

  private async checkLowStockAfterOrder(productIds: string[]) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });
    for (const p of products) {
      if (Number(p.quantity) <= Number(p.reorderLevel)) {
        await notificationService
          .notifyLowStock(p.name, Number(p.quantity), Number(p.reorderLevel))
          .catch((err) => logger.error("notifyLowStock failed", err));
      }
    }
  }

  private async sendReceiptEmail(
    payload: RawOrderInput,
    order: { orderNumber: string; totalAmount: Prisma.Decimal }
  ) {
    const email = payload.customerEmail;
    if (!email || !isEmailConfigured()) return;
    await emailService.sendEmail(
      email,
      `Receipt for order ${order.orderNumber}`,
      `<p>Thank you for your purchase. Order total: ${order.totalAmount}</p>`
    );
  }

  async getOrders(page = 1, limit = 20) {
    const { skip, take } = getPagination(page, limit);

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { createdBy: true, items: { include: orderItemInclude } }
      }),
      prisma.order.count()
    ]);

    return {
      orders,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getOrder(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude
    });
    if (!order) throw new AppError("Order not found", 404);
    return order;
  }

  // Restores stock in baseUnit terms — needs each item's conversionToBase,
  // so productUnit must be included (a plain OrderItem only has the sold
  // quantity, e.g. "3 bags", not how much baseUnit stock that represents).
  private async restoreStock(tx: TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { productUnit: true }
    });
    await Promise.all(
      items.map((item) => {
        const conversionToBase = item.productUnit
          ? Number(item.productUnit.conversionToBase)
          : 1; // fallback for legacy rows created before productUnit existed
        const baseUnits = Number(item.quantity) * conversionToBase;
        return tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: baseUnits } }
        });
      })
    );
    return items;
  }

  async refundOrder(id: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!order) throw new AppError("Order not found", 404);
    if (order.status !== "COMPLETED") {
      throw new AppError("Only completed orders can be refunded", 400);
    }

    await prisma.$transaction(async (tx) => {
      const items = await this.restoreStock(tx, id);
      await tx.order.update({
        where: { id },
        data: { status: "REFUNDED" }
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: "ORDER_REFUNDED",
          details: `Order ${order.orderNumber} refunded; restored ${items.length} item(s)`
        }
      });
    });

    return true;
  }

  async cancelOrder(id: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!order) throw new AppError("Order not found", 404);
    if (order.status !== "COMPLETED") {
      throw new AppError("Only completed orders can be cancelled", 400);
    }

    await prisma.$transaction(async (tx) => {
      const items = await this.restoreStock(tx, id);
      await tx.order.update({
        where: { id },
        data: { status: "CANCELLED" }
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: "ORDER_CANCELLED",
          details: `Order ${order.orderNumber} cancelled; restored ${items.length} item(s)`
        }
      });
    });

    return true;
  }
}

export default new OrdersService();