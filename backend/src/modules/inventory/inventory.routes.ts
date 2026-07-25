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
import path from "path";

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

// Image upload route
const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (error: Error | null, destination: string) => void) => {
    const uploadsPath = path.resolve(__dirname, "../../../uploads");
    cb(null, uploadsPath);
  },
  filename: (_req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: storage });

router.post(
  "/upload-image",
  authorize(["admin"]),
  upload.single("image"),
  (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const url = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    res.json({ success: true, data: { url } });
  }
);

export default router;