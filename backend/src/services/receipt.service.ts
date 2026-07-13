import PDFDocument from "pdfkit";
import prisma from "../database/prisma";
import { AppError } from "../utils/AppError";

class ReceiptService {
  async generateReceipt(orderId: string): Promise<Buffer> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        createdBy: true,
        items: { include: { product: true } }
      }
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const settings = await prisma.setting.findFirst();
    const businessName = settings?.businessName ?? "Hardware Store";
    const taxRate = settings?.taxRate ? Number(settings.taxRate) : 0;
    const currency = settings?.currency ?? "KES";
    const footer =
      settings?.receiptFooter ??
      "Thank you for shopping with us.";

    const subtotal = Number(order.subtotal ?? order.totalAmount);
    const discount = Number(order.discount);
    const taxAmount = Number(order.taxAmount ?? 0);

    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on("data", (chunk) => buffers.push(chunk));

    return new Promise<Buffer>((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      doc.fontSize(20).text(businessName);
      if (settings?.address) {
        doc.fontSize(9).text(settings.address);
      }
      if (settings?.phone) {
        doc.fontSize(9).text(`Tel: ${settings.phone}`);
      }

      doc.moveDown();
      doc.fontSize(10).text(`Receipt No: ${order.receiptNumber}`);
      doc.text(`Order No: ${order.orderNumber}`);
      doc.text(`Date: ${order.createdAt.toLocaleString()}`);
      doc.text(`Cashier: ${order.createdBy.fullName}`);
      if (order.customerName) {
        doc.text(`Customer: ${order.customerName}`);
      }

      doc.moveDown();
      doc.text("--------------------------------");

      order.items.forEach((item) => {
        doc.text(`${item.product.name}`);
        doc.text(
          `${item.quantity} x ${currency} ${item.unitPrice} = ${currency} ${item.total}`
        );
        doc.moveDown(0.5);
      });

      doc.text("--------------------------------");
      doc.moveDown();
      doc.text(`Subtotal: ${currency} ${subtotal.toFixed(2)}`);

      if (discount > 0) {
        doc.text(`Discount: -${currency} ${discount.toFixed(2)}`);
      }

      if (taxRate > 0) {
        doc.text(`Tax (${taxRate}%): ${currency} ${taxAmount.toFixed(2)}`);
      }

      doc.fontSize(14).text(`Total: ${currency} ${order.totalAmount}`);
      doc.moveDown();
      doc.fontSize(10).text(`Payment: ${order.paymentMethod}`);
      doc.moveDown();
      doc.text(footer);
      doc.end();
    });
  }
}

export default new ReceiptService();
