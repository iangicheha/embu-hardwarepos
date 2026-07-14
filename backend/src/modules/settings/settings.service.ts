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
}

export default new SettingsService();
