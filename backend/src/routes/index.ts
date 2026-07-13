import { Router } from "express";
import { PrismaClient } from "@prisma/client";

import authRoutes from "../modules/auth/auth.routes";
import usersRoutes from "../modules/users/users.routes";
import inventoryRoutes from "../modules/inventory/inventory.routes";
import categoriesRoutes from "../modules/categories/categories.routes";
import suppliersRoutes from "../modules/suppliers/suppliers.routes";
import ordersRoutes from "../modules/orders/orders.routes";
import restocksRoutes from "../modules/restocks/restocks.routes";
import reportsRoutes from "../modules/reports/reports.routes";
import settingsRoutes from "../modules/settings/settings.routes";
import auditRoutes from "../modules/audit/audit.routes";
import notificationsRoutes from "../modules/notifications/notifications.routes";

const router = Router();
const prisma = new PrismaClient();

router.get("/", (_, res) => {
  res.json({
    success: true,
    name: "Hardware Store API",
    version: "1.0.0"
  });
});

router.get("/health", async (_, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/categories", categoriesRoutes);
router.use("/suppliers", suppliersRoutes);
router.use("/orders", ordersRoutes);
router.use("/restocks", restocksRoutes);
router.use("/reports", reportsRoutes);
router.use("/settings", settingsRoutes);
router.use("/audit", auditRoutes);
router.use("/notifications", notificationsRoutes);

export default router;
