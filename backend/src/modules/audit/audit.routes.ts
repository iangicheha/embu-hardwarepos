import { Router } from "express";
import auditController from "./audit.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validateQuery } from "../../middleware/validation.middleware";
import { z } from "zod";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().min(1).max(120).optional()
});

const userLogsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const router = Router();

router.use(authenticate);
router.use(authorize(["admin"]));

router.get("/", validateQuery(listQuery), auditController.getLogs);
router.get(
  "/user/:userId",
  validateQuery(userLogsQuery),
  auditController.getUserLogs
);
router.get("/:id", auditController.getLogById);

export default router;
