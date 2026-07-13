import prisma from "../../database/prisma";
import { buildPagination, getPagination } from "../../utils/pagination";
import { AppError } from "../../utils/AppError";

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true
} as const;

class AuditService {
  async getLogs(page = 1, limit = 20, action?: string) {
    const { skip, take } = getPagination(page, limit);
    const where = action ? { action } : {};

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: { user: { select: userSelect } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getLogById(id: string) {
    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: { user: { select: userSelect } }
    });
    if (!log) throw new AppError("Audit log not found", 404);
    return log;
  }

  async getUserLogs(
    userId: string,
    page = 1,
    limit = 20
  ) {
    const { skip, take } = getPagination(page, limit);
    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.auditLog.count({ where: { userId } })
    ]);
    return {
      logs,
      pagination: buildPagination(page, limit, total)
    };
  }
}

export default new AuditService();
