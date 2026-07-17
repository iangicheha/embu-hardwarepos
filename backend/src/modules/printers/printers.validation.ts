import { z } from "zod";

const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

export const createPrinterSchema = z.object({
  name: z.string().trim().min(1).max(100),
  printerType: z.enum(["THERMAL", "INKJET", "LASER"]).default("THERMAL"),
  connectionType: z.enum(["USB", "NETWORK", "WIFI", "BLUETOOTH", "WINDOWS"]).default("USB"),
  ipAddress: z.string().regex(ipRegex).optional().or(z.literal("")),
  port: z.string().optional(),
  isDefault: z.boolean().default(false),
  paperSize: z.enum(["58MM", "80MM", "A4"]).default("80MM"),
  autoPrint: z.boolean().default(false),
});

export const updatePrinterSchema = createPrinterSchema.partial();

export const listPrintersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
