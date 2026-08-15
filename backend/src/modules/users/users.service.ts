import bcrypt from "bcrypt";
import prisma from "../../database/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";
import { env } from "../../config/env";

const userPublicSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true
} satisfies Prisma.UserSelect;

type CreateUserInput = {
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  role: "admin" | "worker";
};

type UpdateUserInput = {
  fullName?: string;
  phone?: string;
  role?: "admin" | "worker";
};

type ChangePasswordInput = {
  currentPassword?: string;
  newPassword: string;
};

class UsersService {
  async getUsers(page = 1, limit = 20, search?: string) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            {
              fullName: {
                contains: search,
                mode: Prisma.QueryMode.insensitive
              }
            },
            {
              email: {
                contains: search,
                mode: Prisma.QueryMode.insensitive
              }
            }
          ]
        }
      : {};

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: userPublicSelect
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userPublicSelect
    });
    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  async createUser(data: CreateUserInput, createdBy: string) {
    const email = data.email.toLowerCase();
    const username = data.username.toLowerCase();

    // Login looks accounts up by username, not email — checking both here
    // (like auth.service.ts's register() already does) so a collision on
    // either one is caught before create, not as an opaque DB error.
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existing) {
      throw new AppError("User with this email or username already exists", 409);
    }

    const passwordHash = await bcrypt.hash(
      data.password,
      env.BCRYPT_SALT_ROUNDS
    );

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: data.fullName.trim(),
          username,
          email,
          phone: data.phone,
          passwordHash,
          role: data.role
        },
        select: userPublicSelect
      });
      await tx.auditLog.create({
        data: {
          userId: createdBy,
          action: "USER_CREATED",
          details: `Created user ${created.email}`
        }
      });
      return created;
    });

    return user;
  }

  async updateUser(id: string, data: UpdateUserInput, updatedBy: string) {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true }
    });
    if (!existing) throw new AppError("User not found", 404);

    // Prevent the actor from self-demoting out of admin role
    // (would lock them out of the admin-only users router).
    if (updatedBy === id && data.role && data.role !== existing.role) {
      throw new AppError(
        "You cannot change your own role",
        400
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          fullName: data.fullName?.trim(),
          phone: data.phone,
          role: data.role
        },
        select: userPublicSelect
      });
      await tx.auditLog.create({
        data: {
          userId: updatedBy,
          action: "USER_UPDATED",
          details: `Updated user ${updated.email}`
        }
      });
      return updated;
    });

    return user;
  }

  async changePassword(
    id: string,
    data: ChangePasswordInput,
    requesterId: string,
    requesterRole: "admin" | "worker"
  ) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, passwordHash: true }
    });
    if (!user) throw new AppError("User not found", 404);

    const isSelf = requesterId === id;
    const isAdmin = requesterRole === "admin";

    if (!isSelf && !isAdmin) {
      throw new AppError("Not authorized to change this password", 403);
    }

    if (isSelf && !isAdmin) {
      if (!data.currentPassword) {
        throw new AppError("Current password is required", 400);
      }
      const valid = await bcrypt.compare(
        data.currentPassword,
        user.passwordHash
      );
      if (!valid) {
        throw new AppError("Current password is incorrect", 400);
      }
    }

    const passwordHash = await bcrypt.hash(
      data.newPassword,
      env.BCRYPT_SALT_ROUNDS
    );

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash }
      });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({
        data: {
          userId: requesterId,
          action: "PASSWORD_CHANGED",
          details: `Password changed for ${user.email}`
        }
      });
    });

    return true;
  }

  async deactivateUser(id: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isActive: true }
    });
    if (!user) throw new AppError("User not found", 404);
    if (!user.isActive) return true;
    if (id === adminId) {
      throw new AppError("You cannot deactivate your own account", 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: false }
      });
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "USER_DEACTIVATED",
          details: `Deactivated user ${user.email}`
        }
      });
    });

    return true;
  }

  async activateUser(id: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, isActive: true }
    });
    if (!user) throw new AppError("User not found", 404);
    if (user.isActive) return true;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: true }
      });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "USER_ACTIVATED",
          details: `Activated user ${user.email}`
        }
      });
    });

    return true;
  }

  async deleteUser(id: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true }
    });
    if (!user) throw new AppError("User not found", 404);
    if (id === adminId) {
      throw new AppError("You cannot delete your own account", 400);
    }

    // Order.createdById and Restock.receivedById have no cascade behavior,
    // so the DB itself refuses this delete once the user has any sales or
    // restock history — deleting them would otherwise orphan/corrupt that
    // history. Check up front so the error is clear instead of a raw DB
    // constraint failure, and so the audit log write below never runs for
    // a delete that didn't actually happen.
    const [orderCount, restockCount] = await Promise.all([
      prisma.order.count({ where: { createdById: id } }),
      prisma.restock.count({ where: { receivedById: id } })
    ]);
    if (orderCount > 0 || restockCount > 0) {
      throw new AppError(
        "This user has order or restock history and can't be deleted — deactivate the account instead to preserve that history.",
        409
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: "USER_DELETED",
          details: `Deleted user ${user.email}`
        }
      });
    });

    return true;
  }
}

export default new UsersService();