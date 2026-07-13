import { z } from "zod";

export const createRestockSchema = z.object({
  productId: z.string().uuid(),
  supplierId: z.string().uuid(),
  quantityAdded: z.number().int().positive(),
  cost: z.number().nonnegative().finite(),
  notes: z.string().trim().max(2000).optional(),
  updateBuyingPrice: z.boolean().optional().default(false)
});

export const listRestocksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
