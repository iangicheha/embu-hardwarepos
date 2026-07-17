import { Router } from "express";
import printersController from "./printers.controller";
import { validate } from "../../middleware/validation.middleware";
import { authenticate } from "../../middleware/auth.middleware";
import { createPrinterSchema, updatePrinterSchema, listPrintersQuerySchema } from "./printers.validation";

const router = Router();

router.use(authenticate);

router
  .route("/")
  .get(validate(listPrintersQuerySchema, "query"), printersController.getPrinters)
  .post(validate(createPrinterSchema), printersController.createPrinter);

router
  .route("/:id")
  .get(printersController.getPrinter)
  .patch(validate(updatePrinterSchema), printersController.updatePrinter)
  .delete(printersController.deletePrinter);

router.patch("/:id/default", printersController.setDefaultPrinter);
router.get("/default/current", printersController.getDefaultPrinter);
router.post("/:id/test", printersController.testPrinter);

export default router;
