import { Response } from "express";
import restocksService from "./restocks.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class RestocksController {
  createRestock = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const result = await restocksService.createRestock(
        req.body,
        req.user!.userId
      );
      successResponse(res, result, "Restock created", 201);
    }
  );

  getRestocks = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await restocksService.getRestocks(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number
      );
      successResponse(res, result, "Restocks retrieved");
    }
  );

  getRestock = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const result = await restocksService.getRestock(
        getParam(req.params.id)
      );
      successResponse(res, result, "Restock retrieved");
    }
  );
}

export default new RestocksController();
