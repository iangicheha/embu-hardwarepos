import { Response } from "express";
import ordersService from "./orders.service";
import receiptService from "../../services/receipt.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class OrdersController {
  createOrder = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const result = await ordersService.createOrder(
        req.body,
        req.user!.userId
      );
      successResponse(res, result, "Order created", 201);
    }
  );

  getOrders = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await ordersService.getOrders(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number
      );
      successResponse(res, result, "Orders retrieved");
    }
  );

  getOrder = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const order = await ordersService.getOrder(
        getParam(req.params.id)
      );
      successResponse(res, order, "Order retrieved");
    }
  );

  refundOrder = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await ordersService.refundOrder(
        getParam(req.params.id),
        req.user!.userId
      );
      successResponse(res, null, "Order refunded");
    }
  );

  cancelOrder = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await ordersService.cancelOrder(
        getParam(req.params.id),
        req.user!.userId
      );
      successResponse(res, null, "Order cancelled");
    }
  );
}

export default new OrdersController();
