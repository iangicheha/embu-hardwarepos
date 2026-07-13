import { Router } from "express";
import inventoryController from "./inventory.controller";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema
} from "./inventory.validation";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate, validateQuery } from "../../middleware/validation.middleware";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateQuery(listProductsQuerySchema),
  inventoryController.getProducts
);
router.get("/low-stock", inventoryController.lowStockProducts);
router.get("/:id", inventoryController.getProduct);

router.post(
  "/",
  authorize(["admin"]),
  validate(createProductSchema),
  inventoryController.createProduct
);

router.put(
  "/:id",
  authorize(["admin"]),
  validate(updateProductSchema),
  inventoryController.updateProduct
);

router.delete(
  "/:id",
  authorize(["admin"]),
  inventoryController.deleteProduct
);

export default router;
