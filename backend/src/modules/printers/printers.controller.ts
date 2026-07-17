import { Response } from "express";
import printersService from "./printers.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class PrintersController {
  createPrinter = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedBody = (req as any).validatedBody;
      const result = await printersService.createPrinter(validatedBody);
      successResponse(res, result, "Printer created");
    }
  );

  getPrinters = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await printersService.getPrinters(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number
      );
      successResponse(res, result, "Printers retrieved");
    }
  );

  getPrinter = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const printer = await printersService.getPrinter(getParam(req.params.id));
      successResponse(res, printer, "Printer retrieved");
    }
  );

  updatePrinter = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedBody = (req as any).validatedBody;
      const printer = await printersService.updatePrinter(
        getParam(req.params.id),
        validatedBody
      );
      successResponse(res, printer, "Printer updated");
    }
  );

  deletePrinter = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await printersService.deletePrinter(getParam(req.params.id));
      successResponse(res, null, "Printer deleted");
    }
  );

  setDefaultPrinter = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await printersService.setDefaultPrinter(getParam(req.params.id));
      successResponse(res, null, "Default printer set");
    }
  );

  getDefaultPrinter = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const printer = await printersService.getDefaultPrinter();
      successResponse(res, printer, "Default printer retrieved");
    }
  );

  testPrinter = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const result = await printersService.testPrinter(getParam(req.params.id));
      successResponse(res, result, "Test print sent");
    }
  );
}

export default new PrintersController();
