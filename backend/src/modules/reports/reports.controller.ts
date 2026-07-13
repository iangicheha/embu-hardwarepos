import { Response } from "express";
import reportsService from "./reports.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { AuthenticatedRequest } from "../../types/request";
import { AppError } from "../../utils/AppError";

const parseDate = (
  value: unknown,
  field: "start" | "end"
): Date => {
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    throw new AppError(`Invalid ${field} date`, 400);
  }
  return d;
};

class ReportsController {
  dashboard = catchAsync(
    async (_req: AuthenticatedRequest, res: Response) => {
      const data = await reportsService.dashboardSummary();
      successResponse(res, data, "Dashboard summary retrieved");
    }
  );

  salesReport = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const start = parseDate(validatedQuery.start, "start");
      const end = parseDate(validatedQuery.end, "end");
      const report = await reportsService.salesReport(start, end);
      successResponse(res, report, "Sales report retrieved");
    }
  );

  inventoryReport = catchAsync(
    async (_req: AuthenticatedRequest, res: Response) => {
      const report = await reportsService.inventoryReport();
      successResponse(res, report, "Inventory report retrieved");
    }
  );

  profitReport = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const start = parseDate(validatedQuery.start, "start");
      const end = parseDate(validatedQuery.end, "end");
      const report = await reportsService.profitReport(start, end);
      successResponse(res, report, "Profit report retrieved");
    }
  );

  topSellingProducts = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const start = parseDate(validatedQuery.start, "start");
      const end = parseDate(validatedQuery.end, "end");
      const limit = validatedQuery.limit
        ? Number(validatedQuery.limit)
        : 10;
      const report = await reportsService.topSellingProducts(
        start,
        end,
        limit
      );
      successResponse(res, report, "Top selling products retrieved");
    }
  );

  paymentMethodBreakdown = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const start = parseDate(validatedQuery.start, "start");
      const end = parseDate(validatedQuery.end, "end");
      const report = await reportsService.paymentMethodBreakdown(
        start,
        end
      );
      successResponse(res, report, "Payment breakdown retrieved");
    }
  );

  restockCostReport = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const start = parseDate(validatedQuery.start, "start");
      const end = parseDate(validatedQuery.end, "end");
      const report = await reportsService.restockCostReport(
        start,
        end
      );
      successResponse(res, report, "Restock cost report retrieved");
    }
  );

  monthlySalesChart = catchAsync(
    async (_req: AuthenticatedRequest, res: Response) => {
      const data = await reportsService.monthlySalesChart();
      successResponse(res, data, "Monthly sales chart data retrieved");
    }
  );

  exportSalesCsv = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const start = parseDate(validatedQuery.start, "start");
      const end = parseDate(validatedQuery.end, "end");
      const csv = await reportsService.exportSalesCsv(start, end);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="sales-report.csv"'
      );
      res.send(csv);
    }
  );
}

export default new ReportsController();
