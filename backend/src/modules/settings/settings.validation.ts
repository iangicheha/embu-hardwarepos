import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .nullable()
  .optional();

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone")
  .nullable()
  .optional();

export const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(200).optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  phone: phoneSchema,
  email: emailSchema,
  taxRate: z.number().min(0).max(100).nullable().optional(),
  currency: z
    .string()
    .trim()
    .length(3)
    .toUpperCase()
    .nullable()
    .optional(),
  receiptFooter: z.string().trim().max(500).nullable().optional()
});
