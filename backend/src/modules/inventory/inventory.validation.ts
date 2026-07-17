import { z } from "zod";

const trimmedCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "productCode is required")
  .max(64);

const baseProductObject = z.object({
  productCode: trimmedCode,
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  buyingPrice: z.number().positive().finite(),
  sellingPrice: z.number().positive().finite(),
  quantity: z.number().int().min(0),
  reorderLevel: z.number().int().min(0),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional()
});

export const createProductSchema = baseProductObject.refine(
  (d) => d.sellingPrice >= d.buyingPrice,
  {
    message: "sellingPrice must be greater than or equal to buyingPrice",
    path: ["sellingPrice"]
  }
);

export const updateProductSchema = baseProductObject.partial().refine(
  (d) =>
    d.sellingPrice === undefined ||
    d.buyingPrice === undefined ||
    d.sellingPrice >= d.buyingPrice,
  {
    message: "sellingPrice must be greater than or equal to buyingPrice",
    path: ["sellingPrice"]
  }
);

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional()
});
