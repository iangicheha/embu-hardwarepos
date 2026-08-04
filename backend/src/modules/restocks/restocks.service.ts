import { Prisma } from "@prisma/client";
import prisma, { TransactionClient } from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";
import notificationService from "../../services/notification.service";
import { logger } from "../../config/logger";

type CreateRestockInput = {
  productId: string;
  supplierId: string;
  quantityAdded: number;
  cost: number;
  notes?: string;
  updateBuyingPrice?: boolean;
};

type UpdateRestockInput = {
  supplierId?: string;
  quantityAdded?: number;
  cost?: number;
  notes?: string;
};

class RestocksService {
  async createRestock(payload: CreateRestockInput, userId: string) {
    if (payload.quantityAdded <= 0) {
      throw new AppError("quantityAdded must be positive", 400);
    }

    const restock = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: payload.productId },
        select: { id: true, name: true, quantity: true, reorderLevel: true }
      });
      if (!product) throw new AppError("Product not found", 404);

      const supplier = await tx.supplier.findUnique({
        where: { id: payload.supplierId },
        select: { id: true }
      });
      if (!supplier) throw new AppError("Supplier not found", 404);

      // Lock the product row to prevent racing orders consuming the
      // post-restock quantity before this transaction completes.
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${payload.productId} FOR UPDATE`;

      const created = await tx.restock.create({
        data: {
          productId: payload.productId,
          supplierId: payload.supplierId,
          quantityAdded: payload.quantityAdded,
          cost: payload.cost,
          notes: payload.notes,
          receivedById: userId
        }
      });

      const productUpdate: Prisma.ProductUpdateInput = {
        quantity: { increment: payload.quantityAdded }
      };
      if (payload.updateBuyingPrice === true) {
        productUpdate.buyingPrice = payload.cost / payload.quantityAdded;
      }

      await tx.product.update({
        where: { id: payload.productId },
        data: productUpdate
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "RESTOCK_CREATED",
          details: `Restocked ${payload.quantityAdded} units of ${product.name}`
        }
      });

      return { created, productName: product.name };
    });

    notificationService
      .notifyRestock(restock.productName, payload.quantityAdded)
      .catch((err) => logger.error("notifyRestock failed", err));

    return restock.created;
  }

  async updateRestock(id: string, payload: UpdateRestockInput, userId: string) {
    if (payload.quantityAdded !== undefined && payload.quantityAdded <= 0) {
      throw new AppError("quantityAdded must be positive", 400);
    }

    if (payload.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: payload.supplierId },
        select: { id: true }
      });
      if (!supplier) throw new AppError("Supplier not found", 404);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.restock.findUnique({
        where: { id },
        include: { product: { select: { id: true, name: true, quantity: true } } }
      });
      if (!existing) throw new AppError("Restock not found", 404);

      // Lock the product row before adjusting its quantity, same as create.
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${existing.productId} FOR UPDATE`;

      // If quantityAdded is changing, the product's stock needs to move by
      // the difference, not by the new value outright — e.g. correcting a
      // restock from 50 to 40 should remove 10 from stock, not set it to 40.
      if (payload.quantityAdded !== undefined) {
        const currentQuantityAdded = Number(existing.quantityAdded.toString());
        const currentProductQuantity = Number(existing.product.quantity.toString());
        const delta = Number(payload.quantityAdded) - currentQuantityAdded;
        const newQuantity = currentProductQuantity + delta;
        if (newQuantity < 0) {
          throw new AppError(
            "Cannot reduce this restock below the amount already sold/used from stock",
            400
          );
        }
        await tx.product.update({
          where: { id: existing.productId },
          data: { quantity: { increment: delta } }
        });
      }

      const result = await tx.restock.update({
        where: { id },
        data: {
          supplierId: payload.supplierId,
          quantityAdded: payload.quantityAdded,
          cost: payload.cost,
          notes: payload.notes
        },
        include: { product: true, supplier: true, receivedBy: true }
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "RESTOCK_UPDATED",
          details: `Updated restock ${id} for ${existing.product.name}`
        }
      });

      return result;
    });

    return updated;
  }

  async deleteRestock(id: string, userId: string) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.restock.findUnique({
        where: { id },
        include: { product: { select: { id: true, name: true, quantity: true } } }
      });
      if (!existing) throw new AppError("Restock not found", 404);

      await tx.$queryRaw`SELECT id FROM products WHERE id = ${existing.productId} FOR UPDATE`;

      const newQuantity = Number(existing.product.quantity.toString()) - Number(existing.quantityAdded.toString());
      if (newQuantity < 0) {
        throw new AppError(
          "Cannot delete this restock — some of the stock it added has already been sold/used",
          400
        );
      }

      await tx.product.update({
        where: { id: existing.productId },
        data: { quantity: { decrement: existing.quantityAdded } }
      });

      await tx.restock.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId,
          action: "RESTOCK_DELETED",
          details: `Deleted restock of ${existing.quantityAdded} units of ${existing.product.name}`
        }
      });
    });
  }

  async getRestocks(page = 1, limit = 20) {
    const { skip, take } = getPagination(page, limit);
    const [restocks, total] = await prisma.$transaction([
      prisma.restock.findMany({
        skip,
        take,
        include: { product: true, supplier: true, receivedBy: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.restock.count()
    ]);
    return {
      restocks,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getRestock(id: string) {
    const restock = await prisma.restock.findUnique({
      where: { id },
      include: { product: true, supplier: true, receivedBy: true }
    });
    if (!restock) throw new AppError("Restock not found", 404);
    return restock;
  }
}

export default new RestocksService();

// suppress unused-import warning while keeping TransactionClient for future use
void ({} as TransactionClient);