import { Prisma } from "@prisma/client";
import prisma from "../../database/prisma";

type UpdateSettingsInput = Prisma.SettingUpdateInput;

class SettingsService {
  async getSettings() {
    return prisma.setting.findFirst();
  }

  async updateSettings(data: UpdateSettingsInput, userId: string) {
    const settings = await prisma.$transaction(async (tx) => {
      const existing = await tx.setting.findFirst({
        select: { id: true }
      });

      const updated = existing
        ? await tx.setting.update({
            where: { id: existing.id },
            data
          })
        : await tx.setting.create({
            data: {
              businessName: "Home Depot Store",
              ...data
            } as Prisma.SettingCreateInput
          });

      await tx.auditLog.create({
        data: {
          userId,
          action: "SETTINGS_UPDATED",
          details: "Store settings updated"
        }
      });

      return updated;
    });

    return settings;
  }

  async resetAnalyticsData(userId: string) {
    return await prisma.$transaction(async (tx) => {
      // Delete all orders and order items (this will cascade delete order items)
      await tx.order.deleteMany({});

      // Delete all restocks
      await tx.restock.deleteMany({});

      // Delete audit logs (optional - you might want to keep some logs)
      await tx.auditLog.deleteMany({});

      // Reset product quantities to zero (optional - comment out if you want to preserve inventory)
      await tx.product.updateMany({
        where: {},
        data: {
          quantity: 0
        }
      });

      // Log the reset action
      await tx.auditLog.create({
        data: {
          userId,
          action: "ANALYTICS_DATA_RESET",
          details: "All analytics data, orders, restocks, and inventory quantities reset"
        }
      });

      return { success: true, message: "Analytics data reset successfully" };
    });
  }
}

export default new SettingsService();
