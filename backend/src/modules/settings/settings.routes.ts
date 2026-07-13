import { Router } from "express";
import settingsController from "./settings.controller";
import { updateSettingsSchema } from "./settings.validation";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate } from "../../middleware/validation.middleware";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize(["admin"]),
  settingsController.getSettings
);

router.put(
  "/",
  authorize(["admin"]),
  validate(updateSettingsSchema),
  settingsController.updateSettings
);

export default router;
