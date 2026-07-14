import { Request, Response } from "express";

import inventoryService from "./inventory.service";
import { AuthenticatedRequest } from "../../types/request";
import { getParam } from "../../utils/getParam";

class InventoryController {
  async createProduct(
    req: AuthenticatedRequest,
    res: Response
  ) {
    const product =
      await inventoryService.createProduct(
        req.body,
        req.user!.userId
      );

    res.status(201).json({
      success: true,
      data: product
    });
  }

  async getProducts(
    req: Request,
    res: Response
  ) {
    const result =
      await inventoryService.getProducts(
        Number(req.query.page || 1),
        Number(req.query.limit || 20),
        req.query.search?.toString()
      );

    res.json({
      success: true,
      data: result
    });
  }

  async getProduct(
    req: Request,
    res: Response
  ) {
    const product =
      await inventoryService.getProduct(
        getParam(req.params.id)
      );

    res.json({
      success: true,
      data: product
    });
  }

  async updateProduct(
    req: AuthenticatedRequest,
    res: Response
  ) {
    const product =
      await inventoryService.updateProduct(
        getParam(req.params.id),
        req.body,
        req.user!.userId
      );

    res.json({
      success: true,
      data: product
    });
  }
    async lowStockProducts(
    req: Request,
    res: Response
    ) {
    const products =
        await inventoryService.lowStockProducts();

    res.json({
        success: true,
        data: products
    });
  }
  async deleteProduct(
    req: AuthenticatedRequest,
    res: Response
  ) {
    await inventoryService.deleteProduct(
      getParam(req.params.id),
      req.user!.userId
    );

    res.json({
      success: true,
      message:
        "Product deleted successfully"
    });
  }
}

export default new InventoryController();