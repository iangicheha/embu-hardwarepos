import { Response } from "express";
import inventoryService from "./inventory.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class InventoryController {
  createProduct = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const product = await inventoryService.createProduct(
        req.body,
        req.user!.userId
      );
      successResponse(res, product, "Product created", 201);
    }
  );

  getProducts = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await inventoryService.getProducts(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number,
        validatedQuery.search as unknown as string | undefined
      );
      successResponse(res, result, "Products retrieved");
    }
  );

  getProduct = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const product = await inventoryService.getProduct(
        getParam(req.params.id)
      );
      successResponse(res, product, "Product retrieved");
    }
  );

  updateProduct = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const product = await inventoryService.updateProduct(
        getParam(req.params.id),
        req.body,
        req.user!.userId
      );
      successResponse(res, product, "Product updated");
    }
  );

  lowStockProducts = catchAsync(
    async (_req: AuthenticatedRequest, res: Response) => {
      const products = await inventoryService.lowStockProducts();
      successResponse(res, products, "Low stock products retrieved");
    }
  );

  deleteProduct = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await inventoryService.deleteProduct(
        getParam(req.params.id),
        req.user!.userId
      );
      successResponse(res, null, "Product deleted");
    }
  );
}

export default new InventoryController();
