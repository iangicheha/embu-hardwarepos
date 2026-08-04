import { Router } from "express";
import restocksController from "./restocks.controller";
import {
  createRestockSchema,
  updateRestockSchema,
  listRestocksQuerySchema
} from "./restocks.validation";
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
  validateQuery(listRestocksQuerySchema),
  restocksController.getRestocks
);
router.get("/:id", restocksController.getRestock);
router.post(
  "/",
  authorize(["admin"]),
  validate(createRestockSchema),
  restocksController.createRestock
);
router.put(
  "/:id",
  authorize(["admin"]),
  validate(updateRestockSchema),
  restocksController.updateRestock
);
router.delete(
  "/:id",
  authorize(["admin"]),
  restocksController.deleteRestock
);

export default router;