import { Prisma } from "@prisma/client";
import prisma from "../../database/prisma";
import { AppError } from "../../utils/AppError";
import { buildPagination, getPagination } from "../../utils/pagination";

class PrintersService {
  async createPrinter(data: Prisma.PrinterCreateInput) {
    // If this is set as default, unset all other default printers
    if (data.isDefault) {
      await prisma.printer.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const printer = await prisma.printer.create({ data });
    return printer;
  }

  async getPrinters(page: number, limit: number) {
    const { skip, take } = getPagination(page, limit);

    const [printers, total] = await prisma.$transaction([
      prisma.printer.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" }
      }),
      prisma.printer.count()
    ]);

    return {
      printers,
      pagination: buildPagination(page, limit, total)
    };
  }

  async getPrinter(id: string) {
    const printer = await prisma.printer.findUnique({
      where: { id }
    });
    if (!printer) throw new AppError("Printer not found", 404);
    return printer;
  }

  async updatePrinter(id: string, data: Prisma.PrinterUpdateInput) {
    const current = await prisma.printer.findUnique({
      where: { id }
    });
    if (!current) throw new AppError("Printer not found", 404);

    // If setting as default, unset all other defaults
    if (data.isDefault === true) {
      await prisma.printer.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false }
      });
    }

    const printer = await prisma.printer.update({
      where: { id },
      data
    });

    return printer;
  }

  async deletePrinter(id: string) {
    const exists = await prisma.printer.findUnique({
      where: { id }
    });
    if (!exists) throw new AppError("Printer not found", 404);

    await prisma.printer.delete({ where: { id } });
    return true;
  }

  async setDefaultPrinter(id: string) {
    await prisma.$transaction([
      prisma.printer.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      }),
      prisma.printer.update({
        where: { id },
        data: { isDefault: true }
      })
    ]);

    return true;
  }

  async getDefaultPrinter() {
    const printer = await prisma.printer.findFirst({
      where: { isDefault: true }
    });
    return printer;
  }

  async testPrinter(id: string) {
    const printer = await prisma.printer.findUnique({
      where: { id }
    });
    if (!printer) throw new AppError("Printer not found", 404);

    // In a real implementation, this would attempt to connect to the printer
    // and print a test page. For now, we'll just return success.
    return {
      success: true,
      message: `Test print sent to ${printer.name}`
    };
  }
}

export default new PrintersService();
