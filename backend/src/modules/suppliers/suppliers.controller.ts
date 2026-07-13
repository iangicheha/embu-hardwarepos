import { Response } from "express";
import suppliersService from "./suppliers.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class SuppliersController {
  createSupplier = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const supplier = await suppliersService.createSupplier(
        req.body,
        req.user!.userId
      );
      successResponse(res, supplier, "Supplier created", 201);
    }
  );

  getSuppliers = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await suppliersService.getSuppliers(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number,
        validatedQuery.search as unknown as string | undefined
      );
      successResponse(res, result, "Suppliers retrieved");
    }
  );

  getSupplier = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const supplier = await suppliersService.getSupplier(
        getParam(req.params.id)
      );
      successResponse(res, supplier, "Supplier retrieved");
    }
  );

  updateSupplier = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const supplier = await suppliersService.updateSupplier(
        getParam(req.params.id),
        req.body,
        req.user!.userId
      );
      successResponse(res, supplier, "Supplier updated");
    }
  );

  deleteSupplier = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await suppliersService.deleteSupplier(
        getParam(req.params.id),
        req.user!.userId
      );
      successResponse(res, null, "Supplier deleted");
    }
  );
}

export default new SuppliersController();
