import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .optional();

export const createOrderSchema = z
  .object({
    customerName: z.string().trim().min(1).max(120).optional(),
    customerEmail: emailSchema,
    paymentMethod: z.enum([
      "CASH",
      "MPESA",
      "BANK_TRANSFER",
      "CREDIT"
    ]),
    discount: z.number().min(0).default(0),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive()
        })
      )
      .min(1)
  })
  .refine(
    (d) => {
      const sub = d.items.reduce(
        (sum, i) => sum + i.quantity, // unit price comes from server
        0
      );
      // discount is bounded per line, but the absolute cap is per-order;
      // service layer recomputes subtotal from product prices and re-validates.
      return d.discount <= sub * 1_000_000; // sanity ceiling
    },
    { message: "discount too large", path: ["discount"] }
  );

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["COMPLETED", "REFUNDED", "CANCELLED"]).optional()
});
