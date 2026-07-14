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

// Logo can be either a real http(s) URL or a data: URL (inline image).
// Cap at ~3MB encoded to fit a 2MB image with base64 overhead.
const DATA_URL_MAX = 3_500_000;
const logoUrlSchema = z
  .string()
  .max(DATA_URL_MAX, "Logo is too large")
  .refine(
    (val) => {
      if (val === "") return true;
      if (val.startsWith("data:")) {
        return /^data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+$/.test(val);
      }
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "logoUrl must be a valid http(s) URL or data: URL" }
  )
  .nullable()
  .optional()
  .transform((val) => (val === "" ? null : val));

export const updateSettingsSchema = z.object({
  businessName: z.string().trim().min(2).max(200).optional(),
  logoUrl: logoUrlSchema,
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