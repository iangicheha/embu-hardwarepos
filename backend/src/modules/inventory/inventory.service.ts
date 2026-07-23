import { Prisma } from "@prisma/client";
import prisma from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";
import notificationService from "../../services/notification.service";

const productInclude = {
  supplier: true,
  category: true
} satisfies Prisma.ProductInclude;

const ensureFksExist = async (
  data: { categoryId?: string | null; supplierId?: string | null }
) => {
  if (data.categoryId) {
    const c = await prisma.category.findUnique({
      where: { id: data.categoryId },
      select: { id: true }
    });
    if (!c) throw new AppError("Invalid categoryId", 400);
  }
  if (data.supplierId) {
    const s = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
      select: { id: true }
    });
    if (!s) throw new AppError("Invalid supplierId", 400);
  }
};

const extractConnectId = (
  v:
    | Prisma.CategoryUpdateOneWithoutProductsNestedInput
    | Prisma.SupplierUpdateOneWithoutProductsNestedInput
    | undefined
): string | undefined =>
  v && "connect" in v && v.connect && !Array.isArray(v.connect)
    ? (v.connect as { id?: string }).id
    : undefined;

class InventoryService {
  async createProduct(
    data: Prisma.ProductUncheckedCreateInput,
    userId: string
  ) {
    await ensureFksExist(data);

    const isLowStock =
      typeof data.quantity === "number" &&
      typeof data.reorderLevel === "number" &&
      data.quantity <= data.reorderLevel;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data });
      await tx.auditLog.create({
        data: {
          userId,
          action: "PRODUCT_CREATED",
          details: `Created product ${created.name}`
        }
      });
      return created;
    });

    if (isLowStock) {
      notificationService
        .notifyLowStock(
          product.name,
          product.quantity,
          product.reorderLevel
        )
        .catch((err) => console.error("notifyLowStock failed", err));
    }

    return product;
  }

  async getProducts(
    page: number,
    limit: number,
    search?: string,
    includeArchived = false
  ) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.ProductWhereInput = {
      ...(includeArchived ? {} : { isArchived: false }),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive
                }
              },
              {
                productCode: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive
                }
              }
            ]
          }
        : {})
    };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: productInclude
      }),
      prisma.product.count({ where })
    ]);

    return {
      products,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getProduct(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude
    });
    if (!product) throw new AppError("Product not found", 404);
    return product;
  }

  async updateProduct(
    id: string,
    data: Prisma.ProductUpdateInput,
    userId: string
  ) {
    const current = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        productCode: true,
        quantity: true,
        reorderLevel: true
      }
    });
    if (!current) throw new AppError("Product not found", 404);

    // productCode uniqueness recheck
    if (
      typeof data.productCode === "string" &&
      data.productCode !== current.productCode
    ) {
      const clash = await prisma.product.findUnique({
        where: { productCode: data.productCode }
      });
      if (clash) throw new AppError("Product code already exists", 409);
    }

    await ensureFksExist({
      categoryId: extractConnectId(data.category),
      supplierId: extractConnectId(data.supplier)
    });

    const nextQty =
      typeof data.quantity === "number" ? data.quantity : current.quantity;
    const nextReorder =
      typeof data.reorderLevel === "number"
        ? data.reorderLevel
        : current.reorderLevel;
    const wasLow = current.quantity <= current.reorderLevel;
    const isLow = nextQty <= nextReorder;

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          userId,
          action: "PRODUCT_UPDATED",
          details: `Updated product ${updated.name}`
        }
      });
      return updated;
    });

    // Only notify on a *transition* into low-stock, not on every edit.
    if (isLow && !wasLow) {
      notificationService
        .notifyLowStock(
          product.name,
          product.quantity,
          product.reorderLevel
        )
        .catch((err) => console.error("notifyLowStock failed", err));
    }

    return product;
  }

  async deleteProduct(id: string, userId: string) {
    const exists = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } }
    });
    if (!exists) throw new AppError("Product not found", 404);

    // Products with order history can't be hard-deleted without corrupting
    // past receipts/reports (OrderItem.productId has no cascade/setNull).
    // Archive them instead: they disappear from the active catalogue but
    // stay intact for historical orders.
    if (exists._count.orderItems > 0) {
      if (exists.isArchived) {
        throw new AppError("Product is already archived", 400);
      }

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: { isArchived: true }
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: "PRODUCT_ARCHIVED",
            details: `Archived product ${exists.name} (has existing orders)`
          }
        });
      });

      return { archived: true as const };
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          action: "PRODUCT_DELETED",
          details: `Deleted product ${exists.name}`
        }
      });
    });

    return { archived: false as const };
  }

  async lowStockProducts() {
    // Prisma cannot compare two columns, so use a parameterised raw query
    // and join back through Prisma via $queryRaw. The (quantity, reorderLevel)
    // btree would help; for now, an in-app filter is acceptable up to a few
    // thousand SKUs. For larger catalogues, add an isLowStock boolean column
    // maintained in updateProduct/createProduct (see schema migration).
    const all = await prisma.product.findMany({
      where: { isArchived: false },
      orderBy: { quantity: "asc" },
      include: productInclude
    });
    return all.filter((p) => p.quantity <= p.reorderLevel);
  }
}

export default new InventoryService();