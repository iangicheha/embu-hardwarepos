import { Response } from "express";
import categoriesService from "./categories.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class CategoriesController {
  createCategory = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const category = await categoriesService.createCategory(
        req.body,
        req.user!.userId
      );
      successResponse(res, category, "Category created", 201);
    }
  );

  getCategories = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await categoriesService.getCategories(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number,
        validatedQuery.search as unknown as string | undefined
      );
      successResponse(res, result, "Categories retrieved");
    }
  );

  getCategory = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const category = await categoriesService.getCategory(
        getParam(req.params.id)
      );
      successResponse(res, category, "Category retrieved");
    }
  );

  updateCategory = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const category = await categoriesService.updateCategory(
        getParam(req.params.id),
        req.body,
        req.user!.userId
      );
      successResponse(res, category, "Category updated");
    }
  );

  deleteCategory = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await categoriesService.deleteCategory(
        getParam(req.params.id),
        req.user!.userId
      );
      successResponse(res, null, "Category deleted");
    }
  );
}

export default new CategoriesController();
