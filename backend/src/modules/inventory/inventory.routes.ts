import { Router, Request, Response } from "express";
import inventoryController from "./inventory.controller";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema
} from "./inventory.validation";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validate, validateQuery } from "../../middleware/validation.middleware";
import prisma from "../../database/prisma";

const multer = require("multer");

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateQuery(listProductsQuerySchema),
  inventoryController.getProducts
);
router.get("/low-stock", inventoryController.lowStockProducts);
router.get("/:id", inventoryController.getProduct);

router.post(
  "/",
  authorize(["admin"]),
  validate(createProductSchema),
  inventoryController.createProduct
);

router.put(
  "/:id",
  authorize(["admin"]),
  validate(updateProductSchema),
  inventoryController.updateProduct
);

router.delete(
  "/:id",
  authorize(["admin"]),
  inventoryController.deleteProduct
);

// Image upload route — stores the file bytes in Postgres (via the Image
// model) instead of local disk, so uploads survive backend restarts/redeploys
// on hosts with ephemeral filesystems (e.g. Render's free tier).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB, matches app.ts body limits
});

router.post(
  "/upload-image",
  authorize(["admin"]),
  upload.single("image"),
  async (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    try {
      const image = await prisma.image.create({
        data: {
          data: file.buffer,
          mimeType: file.mimetype
        }
      });

      const url = `${req.protocol}://${req.get("host")}/api/images/${image.id}`;
      res.json({ success: true, data: { url } });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to save image" });
    }
  }
);

export default router;