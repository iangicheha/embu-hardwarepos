import { z } from "zod";

export const createRestockSchema = z.object({
  productId: z.string().uuid(),
  supplierId: z.string().uuid(),
  quantityAdded: z.number().int().positive(),
  cost: z.number().nonnegative().finite(),
  notes: z.string().trim().max(2000).optional(),
  updateBuyingPrice: z.boolean().optional().default(false)
});

// Product is intentionally not editable here — changing which product a
// restock belongs to would require moving stock between two different
// products' quantities, which is a different operation from "fix this
// restock's numbers". Delete + re-create for that case instead.
export const updateRestockSchema = z.object({
  supplierId: z.string().uuid().optional(),
  quantityAdded: z.number().int().positive().optional(),
  cost: z.number().nonnegative().finite().optional(),
  notes: z.string().trim().max(2000).optional()
});

export const listRestocksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});