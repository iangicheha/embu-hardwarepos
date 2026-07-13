import { Router } from "express";
import usersController from "./users.controller";
import {
  updateUserSchema,
  createUserSchema,
  changePasswordSchema,
  listUsersQuerySchema
} from "./users.validation";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import {
  validate,
  validateQuery
} from "../../middleware/validation.middleware";

const router = Router();

router.use(authenticate);

// Listing / reading users is admin-only.
router.get(
  "/",
  authorize(["admin"]),
  validateQuery(listUsersQuerySchema),
  usersController.getUsers
);
router.get(
  "/:id",
  authorize(["admin"]),
  usersController.getUserById
);

router.post(
  "/",
  authorize(["admin"]),
  validate(createUserSchema),
  usersController.createUser
);

router.patch(
  "/:id",
  authorize(["admin"]),
  validate(updateUserSchema),
  usersController.updateUser
);

// Self-service password change is allowed for any authenticated user.
// Admin can reset anyone's password; the service enforces both cases.
router.patch(
  "/:id/password",
  validate(changePasswordSchema),
  usersController.changePassword
);

router.patch(
  "/:id/activate",
  authorize(["admin"]),
  usersController.activateUser
);
router.patch(
  "/:id/deactivate",
  authorize(["admin"]),
  usersController.deactivateUser
);

export default router;
