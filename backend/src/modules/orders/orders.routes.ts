import { Router } from "express";
import ordersController from "./orders.controller";
import ordersReceiptController from "./orders.receipt.controller";
import {
  createOrderSchema,
  listOrdersQuerySchema
} from "./orders.validation";
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
  validateQuery(listOrdersQuerySchema),
  ordersController.getOrders
);
router.post(
  "/",
  validate(createOrderSchema),
  ordersController.createOrder
);
router.get("/:id/receipt", ordersReceiptController.downloadReceipt);
router.get("/:id", ordersController.getOrder);

router.patch(
  "/:id/refund",
  authorize(["admin"]),
  ordersController.refundOrder
);
router.patch(
  "/:id/cancel",
  authorize(["admin"]),
  ordersController.cancelOrder
);

export default router;
