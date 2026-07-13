import { Response } from "express";
import receiptService from "../../services/receipt.service";
import { getParam } from "../../utils/getParam";
import { catchAsync } from "../../utils/catchAsync";
import { AuthenticatedRequest } from "../../types/request";

class OrdersReceiptController {
  downloadReceipt = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const id = getParam(req.params.id);
      const pdf = await receiptService.generateReceipt(id);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="receipt-${id}.pdf"`
      );
      res.send(pdf);
    }
  );
}

export default new OrdersReceiptController();
