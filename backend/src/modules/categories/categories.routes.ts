import { Router } from "express";
import categoriesController from "./categories.controller";
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema
} from "./categories.validation";
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
  validateQuery(listCategoriesQuerySchema),
  categoriesController.getCategories
);
router.get("/:id", categoriesController.getCategory);

router.post(
  "/",
  authorize(["admin"]),
  validate(createCategorySchema),
  categoriesController.createCategory
);

router.put(
  "/:id",
  authorize(["admin"]),
  validate(updateCategorySchema),
  categoriesController.updateCategory
);

router.delete(
  "/:id",
  authorize(["admin"]),
  categoriesController.deleteCategory
);

export default router;
