import { Prisma } from "@prisma/client";
import prisma from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";

type CreateCategoryInput = Prisma.CategoryUncheckedCreateInput;
type UpdateCategoryInput = Prisma.CategoryUpdateInput;

class CategoriesService {
  async createCategory(data: CreateCategoryInput, userId: string) {
    const name = String(data.name).trim();
    const exists = await prisma.category.findUnique({
      where: { name }
    });
    if (exists) throw new AppError("Category name already exists", 409);

    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({
        data: { ...data, name }
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: "CATEGORY_CREATED",
          details: `Created category: ${created.name}`
        }
      });
      return created;
    });

    return category;
  }

  async getCategories(
    page: number,
    limit: number,
    search?: string
  ) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.CategoryWhereInput = search
      ? {
          name: {
            contains: search,
            mode: Prisma.QueryMode.insensitive
          }
        }
      : {};

    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: { _count: { select: { products: true } } }
      }),
      prisma.category.count({ where })
    ]);

    return {
      categories,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getCategory(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { products: true }
    });
    if (!category) throw new AppError("Category not found", 404);
    return category;
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryInput,
    userId: string
  ) {
    const existing = await prisma.category.findUnique({
      where: { id }
    });
    if (!existing) throw new AppError("Category not found", 404);

    if (typeof data.name === "string") {
      const trimmed = data.name.trim();
      if (trimmed !== existing.name) {
        const clash = await prisma.category.findUnique({
          where: { name: trimmed }
        });
        if (clash) throw new AppError("Category name already exists", 409);
        data = { ...data, name: trimmed };
      }
    }

    const category = await prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          userId,
          action: "CATEGORY_UPDATED",
          details: `Updated category: ${updated.name}`
        }
      });
      return updated;
    });

    return category;
  }

  async deleteCategory(id: string, userId: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } }
    });
    if (!category) throw new AppError("Category not found", 404);

    const linkedProducts = category._count.products;

    await prisma.$transaction(async (tx) => {
      // Product.categoryId → Category is onDelete: SetNull, so this
      // automatically un-categorizes any linked products rather than
      // blocking the delete or corrupting anything — categories are just
      // an organizational tag, not something order history depends on.
      await tx.category.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          action: "CATEGORY_DELETED",
          details:
            linkedProducts > 0
              ? `Deleted category: ${category.name} (${linkedProducts} product(s) un-categorized)`
              : `Deleted category: ${category.name}`
        }
      });
    });

    return true;
  }
}

export default new CategoriesService();