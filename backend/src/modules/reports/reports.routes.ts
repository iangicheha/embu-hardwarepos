import { Router } from "express";
import reportsController from "./reports.controller";
import { reportDateRangeSchema } from "./reports.validation";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validateQuery } from "../../middleware/validation.middleware";

const router = Router();

router.use(authenticate);
router.use(authorize(["admin"]));

router.get("/dashboard", reportsController.dashboard);
router.get("/inventory", reportsController.inventoryReport);

router.get(
  "/sales",
  validateQuery(reportDateRangeSchema),
  reportsController.salesReport
);

router.get(
  "/profit",
  validateQuery(reportDateRangeSchema),
  reportsController.profitReport
);

router.get(
  "/top-products",
  validateQuery(reportDateRangeSchema),
  reportsController.topSellingProducts
);

router.get(
  "/payment-breakdown",
  validateQuery(reportDateRangeSchema),
  reportsController.paymentMethodBreakdown
);

router.get(
  "/restock-costs",
  validateQuery(reportDateRangeSchema),
  reportsController.restockCostReport
);

router.get("/monthly-sales-chart", reportsController.monthlySalesChart);

router.get(
  "/sales/export",
  validateQuery(reportDateRangeSchema),
  reportsController.exportSalesCsv
);

export default router;
