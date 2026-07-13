import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone")
  .optional();

export const createSupplierSchema = z.object({
  supplierName: z.string().trim().min(2).max(200),
  contactPerson: z.string().trim().max(200).optional(),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().trim().max(500).optional()
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional()
});
