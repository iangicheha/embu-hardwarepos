import prisma from "../database/prisma";

export const writeAuditLog = async (
  userId: string | undefined,
  action: string,
  details?: string
) => {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      details
    }
  });
};
