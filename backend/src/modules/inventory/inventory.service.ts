import { Prisma } from "@prisma/client";
import prisma from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";
import notificationService from "../../services/notification.service";

const productInclude = {
  supplier: true,
  category: true,
  sellingUnits: true
} satisfies Prisma.ProductInclude;

// Shape coming from the validated request body (inventory.validation.ts) —
// sellingUnits is a plain array here, not yet a Prisma nested-write object.
type SellingUnitInput = {
  id?: string;
  unit: string;
  conversionToBase: number;
  sellingPrice: number;
};

type ProductInput = {
  productCode: string;
  name: string;
  description?: string;
  buyingPrice: number;
  quantity?: number;
  reorderLevel?: number;
  baseUnit?: string;
  sellingUnits?: SellingUnitInput[];
  imageUrl?: string;
  categoryId?: string;
  supplierId?: string;
};

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

class InventoryService {
  async createProduct(
    data: ProductInput,
    userId: string
  ) {
    await ensureFksExist(data);

    const quantity = data.quantity ?? 0;
    const reorderLevel = data.reorderLevel ?? 10;
    const isLowStock = quantity <= reorderLevel;

    const { sellingUnits, categoryId, supplierId, ...rest } = data;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...rest,
          quantity,
          reorderLevel,
          category: categoryId ? { connect: { id: categoryId } } : undefined,
          supplier: supplierId ? { connect: { id: supplierId } } : undefined,
          sellingUnits: {
            create: (sellingUnits ?? []).map((u) => ({
              unit: u.unit,
              conversionToBase: u.conversionToBase,
              sellingPrice: u.sellingPrice
            }))
          }
        },
        include: productInclude
      });
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
          Number(product.quantity),
          Number(product.reorderLevel)
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
    data: Partial<ProductInput>,
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
      categoryId: data.categoryId,
      supplierId: data.supplierId
    });

    const nextQty = data.quantity ?? Number(current.quantity);
    const nextReorder = data.reorderLevel ?? Number(current.reorderLevel);
    const wasLow = Number(current.quantity) <= Number(current.reorderLevel);
    const isLow = nextQty <= nextReorder;

    const { sellingUnits, categoryId, supplierId, ...rest } = data;

    const product = await prisma.$transaction(async (tx) => {
      // sellingUnits is treated as a full replace when provided: clear the
      // old rows and recreate, since the frontend always sends the complete
      // current list (add/remove/edit rows) rather than a diff.
      if (sellingUnits) {
        await tx.productUnit.deleteMany({ where: { productId: id } });
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...rest,
          category:
            categoryId === undefined
              ? undefined
              : categoryId
              ? { connect: { id: categoryId } }
              : { disconnect: true },
          supplier:
            supplierId === undefined
              ? undefined
              : supplierId
              ? { connect: { id: supplierId } }
              : { disconnect: true },
          sellingUnits: sellingUnits
            ? {
                create: sellingUnits.map((u) => ({
                  unit: u.unit,
                  conversionToBase: u.conversionToBase,
                  sellingPrice: u.sellingPrice
                }))
              }
            : undefined
        },
        include: productInclude
      });
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
          Number(product.quantity),
          Number(product.reorderLevel)
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
      // ProductUnit rows cascade-delete via the schema's onDelete: Cascade,
      // but being explicit here keeps this readable/safe if that ever changes.
      await tx.productUnit.deleteMany({ where: { productId: id } });
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
    return all.filter((p) => Number(p.quantity) <= Number(p.reorderLevel));
  }
}

export default new InventoryService();