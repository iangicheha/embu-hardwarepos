import { z } from "zod";

const trimmedCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "productCode is required")
  .max(64);

// A single way this product can be sold, e.g. { unit: "bag", conversionToBase: 50, sellingPrice: 850 }
// meaning 1 bag = 50 of the product's baseUnit (kg), sold at 850.
const sellingUnitSchema = z.object({
  id: z.string().uuid().optional(), // present when updating an existing unit row
  unit: z.string().trim().min(1).max(32),
  conversionToBase: z.number().positive().finite(),
  sellingPrice: z.number().positive().finite()
});

const baseProductObject = z.object({
  productCode: trimmedCode,
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  buyingPrice: z.number().positive().finite(),

  // quantity/reorderLevel are always counted in baseUnit, and support
  // fractions (e.g. 15.5kg of loose stock) so int() would be wrong here.
  quantity: z.number().min(0),
  reorderLevel: z.number().min(0),

  baseUnit: z.string().trim().min(1).max(32),

  // must sell in at least one unit; conversionToBase for the baseUnit
  // itself should be 1 (e.g. {unit:"kg", conversionToBase:1, sellingPrice:25})
  sellingUnits: z.array(sellingUnitSchema).min(1, "At least one selling unit is required"),

  // Accept either a full URL (https://...) or a site-relative path
  // (e.g. "/products/hammer.png") so the frontend can reference locally
  // hosted images in the public/ folder without needing a CDN URL.
  imageUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || z.string().url().safeParse(v).success || v.startsWith("/"),
      { message: "Invalid URL" }
    )
    .optional(),
  categoryId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional()
});

function sellingUnitsAreValid(units: z.infer<typeof sellingUnitSchema>[]) {
  // every selling price must be >= what that unit costs us in buyingPrice terms
  // is enforced per-unit in the refine below (needs buyingPrice, so done in the parent refine)
  const unitNames = units.map((u) => u.unit.trim().toLowerCase());
  return new Set(unitNames).size === unitNames.length; // no duplicate unit names
}

export const createProductSchema = baseProductObject
  .refine((d) => sellingUnitsAreValid(d.sellingUnits), {
    message: "Duplicate selling unit names are not allowed",
    path: ["sellingUnits"]
  })
  .refine(
    (d) =>
      d.sellingUnits.every(
        (u) => u.sellingPrice >= d.buyingPrice * u.conversionToBase
      ),
    {
      message:
        "Each selling unit's price must be greater than or equal to its buyingPrice equivalent",
      path: ["sellingUnits"]
    }
  );

export const updateProductSchema = baseProductObject
  .partial()
  .extend({
    // on update, sellingUnits (if provided) still needs at least one row
    sellingUnits: z.array(sellingUnitSchema).min(1).optional()
  })
  .refine(
    (d) => d.sellingUnits === undefined || sellingUnitsAreValid(d.sellingUnits),
    { message: "Duplicate selling unit names are not allowed", path: ["sellingUnits"] }
  )
  .refine(
    (d) =>
      d.sellingUnits === undefined ||
      d.buyingPrice === undefined ||
      d.sellingUnits.every(
        (u) => u.sellingPrice >= d.buyingPrice! * u.conversionToBase
      ),
    {
      message:
        "Each selling unit's price must be greater than or equal to its buyingPrice equivalent",
      path: ["sellingUnits"]
    }
  );

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional()
});