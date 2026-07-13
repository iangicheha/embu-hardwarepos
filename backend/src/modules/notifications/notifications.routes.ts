import { Router } from "express";
import notificationsController from "./notifications.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validateQuery } from "../../middleware/validation.middleware";
import { z } from "zod";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateQuery(listQuery),
  notificationsController.getNotifications
);
router.patch(
  "/:id/read",
  notificationsController.markAsRead
);
router.delete(
  "/:id",
  notificationsController.deleteNotification
);

export default router;
