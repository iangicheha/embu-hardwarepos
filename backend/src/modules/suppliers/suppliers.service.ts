import { Prisma } from "@prisma/client";
import prisma from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";

type CreateSupplierInput = Prisma.SupplierUncheckedCreateInput;
type UpdateSupplierInput = Prisma.SupplierUpdateInput;

class SuppliersService {
  async createSupplier(data: CreateSupplierInput, userId: string) {
    const supplier = await prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({ data });
      await tx.auditLog.create({
        data: {
          userId,
          action: "SUPPLIER_CREATED",
          details: `Created supplier ${created.supplierName}`
        }
      });
      return created;
    });

    return supplier;
  }

  async getSuppliers(
    page: number,
    limit: number,
    search?: string
  ) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.SupplierWhereInput = search
      ? {
          supplierName: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        }
      : {};

    const [suppliers, total] = await prisma.$transaction([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { supplierName: "asc" }
      }),
      prisma.supplier.count({ where })
    ]);

    return {
      suppliers,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getSupplier(id: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, restocks: true } }
      }
    });
    if (!supplier) throw new AppError("Supplier not found", 404);
    return supplier;
  }

  async updateSupplier(
    id: string,
    data: UpdateSupplierInput,
    userId: string
  ) {
    const existing = await prisma.supplier.findUnique({
      where: { id }
    });
    if (!existing) throw new AppError("Supplier not found", 404);

    const supplier = await prisma.$transaction(async (tx) => {
      const updated = await tx.supplier.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          userId,
          action: "SUPPLIER_UPDATED",
          details: `Updated supplier ${updated.supplierName}`
        }
      });
      return updated;
    });

    return supplier;
  }

  async deleteSupplier(id: string, userId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true, restocks: true } }
      }
    });
    if (!supplier) throw new AppError("Supplier not found", 404);
    if (
      supplier._count.products > 0 ||
      supplier._count.restocks > 0
    ) {
      throw new AppError(
        "Cannot delete supplier with linked products or restocks",
        400
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.supplier.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          action: "SUPPLIER_DELETED",
          details: `Deleted supplier ${supplier.supplierName}`
        }
      });
    });

    return true;
  }
}

export default new SuppliersService();
