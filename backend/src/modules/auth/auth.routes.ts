import { Router } from "express";
import authController from "./auth.controller";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema
} from "./auth.validation";
import { validate } from "../../middleware/validation.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  authLimiter,
  refreshLimiter
} from "../../middleware/rateLimiter.middleware";

const router = Router();

router.post(
  "/register",
  authenticate,
  authorize(["admin"]),
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post(
  "/refresh",
  refreshLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken
);

router.post(
  "/logout",
  authenticate,
  validate(logoutSchema),
  authController.logout
);

export default router;
