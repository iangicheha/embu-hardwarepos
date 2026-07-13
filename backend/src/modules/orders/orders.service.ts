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
  product: true
} satisfies Prisma.OrderItemInclude;

const orderInclude = {
  createdBy: true,
  items: { include: orderItemInclude }
} satisfies Prisma.OrderInclude;

type CreateOrderInput = Prisma.OrderCreateInput;

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

  async createOrder(payload: CreateOrderInput, userId: string) {
    const rawItems = payload.items?.create;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new AppError("Order must have at least one item", 400);
    }
    const items = rawItems as Array<{
      productId: string;
      quantity: number;
    }>;

    const productIds = items.map((i) => i.productId);


    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== productIds.length) {
      throw new AppError("One or more products were not found", 404);
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      if (
        typeof item.quantity === "number" &&
        product.quantity < item.quantity
      ) {
        throw new AppError(
          `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
          400
        );
      }
    }

    const orderItems = items.map((i) => {
      const product = products.find((p) => p.id === i.productId)!;
      const unitPrice = Number(product.sellingPrice);
      return {
        productId: i.productId,
        quantity: i.quantity,
        unitPrice,
        total: unitPrice * i.quantity
      };
    });


    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const discount = payload.discount ? Number(payload.discount) : 0;
    const taxRate = await this.getTaxRate();
    const totals = calculateTotals(subtotal, discount, taxRate);

    const orderNumber = await this.nextOrderNumber();
    const receiptNumber = await this.nextReceiptNumber();

    const order = await prisma.$transaction(async (tx) => {
      // Row-lock each product row so concurrent orders can't oversell.
      // Prisma tagged-template parameterises correctly; $queryRawUnsafe
      // would not, and earlier code silently failed the FOR UPDATE.
      await Promise.all(
        orderItems.map((item) =>
          tx.$queryRaw`SELECT id FROM products WHERE id = ${item.productId} FOR UPDATE`
        )
      );

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
          items: {
            create: orderItems
          }
        },
        include: orderInclude
      });

      await Promise.all(
        orderItems.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } }
          })
        )
      );

      await tx.auditLog.create({
        data: {
          userId,
          action: "ORDER_CREATED",
          details: `Order ${created.orderNumber} created for ${orderNumber}`
        }
      });

      return created;
    });

    // Best-effort post-processing, never blocks the response on failure
    Promise.allSettled([
      this.checkLowStockAfterOrder(orderItems),
      notificationService
        .notifyLargeOrder(order.orderNumber, Number(order.totalAmount))
        .catch((err) =>
          logger.error("notifyLargeOrder failed", err)
        ),
      this.sendReceiptEmail(payload, order)
    ]).catch((err) => logger.error("post-order tasks failed", err));

    return order;
  }

  private async checkLowStockAfterOrder(
    orderItems: Array<{ productId: string }>
  ) {
    const products = await prisma.product.findMany({
      where: { id: { in: orderItems.map((i) => i.productId) } }
    });
    for (const p of products) {
      if (p.quantity <= p.reorderLevel) {
        await notificationService
          .notifyLowStock(p.name, p.quantity, p.reorderLevel)
          .catch((err) =>
            logger.error("notifyLowStock failed", err)
          );
      }
    }
  }

  private async sendReceiptEmail(
    payload: CreateOrderInput,
    order: { orderNumber: string; totalAmount: Prisma.Decimal }
  ) {
    const email = (payload as { customerEmail?: string }).customerEmail;
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

  private async restoreStock(
    tx: TransactionClient,
    orderId: string
  ) {
    const items = await tx.orderItem.findMany({
      where: { orderId }
    });
    await Promise.all(
      items.map((item) =>
        tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } }
        })
      )
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
