import prisma from "../database/prisma";
import { buildPagination, getPagination } from "../utils/pagination";
import { AppError } from "../utils/AppError";

class NotificationService {
  async createNotification(title: string, message: string) {
    return prisma.notification.create({
      data: { title, message }
    });
  }

  async notifyLowStock(productName: string, quantity: number, reorderLevel: number) {
    return this.createNotification(
      "Low Stock Alert",
      `${productName} is low on stock (${quantity} left, reorder at ${reorderLevel})`
    );
  }

  async notifyRestock(productName: string, quantityAdded: number) {
    return this.createNotification(
      "Restock Received",
      `${quantityAdded} units of ${productName} were restocked`
    );
  }

  async notifyLargeOrder(orderNumber: string, totalAmount: number) {
    if (totalAmount < 50000) {
      return null;
    }

    return this.createNotification(
      "Large Order",
      `Order ${orderNumber} completed for KES ${totalAmount}`
    );
  }

  async getNotifications(page = 1, limit = 20) {
    const { skip, take } = getPagination(page, limit);

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.notification.count()
    ]);

    return {
      notifications,
      pagination: buildPagination(page, limit, total)
    };
  }

  async markAsRead(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    return prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
  }

  async deleteNotification(id: string) {
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    await prisma.notification.delete({ where: { id } });
    return true;
  }
}

export default new NotificationService();
