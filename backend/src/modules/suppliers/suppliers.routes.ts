import { Router } from "express";
import suppliersController from "./suppliers.controller";
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema
} from "./suppliers.validation";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  validate,
  validateQuery
} from "../../middleware/validation.middleware";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateQuery(listSuppliersQuerySchema),
  suppliersController.getSuppliers
);
router.get("/:id", suppliersController.getSupplier);

router.post(
  "/",
  authorize(["admin"]),
  validate(createSupplierSchema),
  suppliersController.createSupplier
);

router.put(
  "/:id",
  authorize(["admin"]),
  validate(updateSupplierSchema),
  suppliersController.updateSupplier
);

router.delete(
  "/:id",
  authorize(["admin"]),
  suppliersController.deleteSupplier
);

export default router;
