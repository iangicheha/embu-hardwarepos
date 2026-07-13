import { Router } from "express";
import restocksController from "./restocks.controller";
import {
  createRestockSchema,
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

export default router;
