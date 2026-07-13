import { z } from "zod";

const dateLike = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(new Date(s).getTime()), {
    message: "Invalid date"
  });

export const reportDateRangeSchema = z
  .object({
    start: dateLike,
    end: dateLike,
    limit: z.coerce.number().int().min(1).max(100).default(10)
  })
  .refine(
    (d) => new Date(d.start).getTime() <= new Date(d.end).getTime(),
    { message: "start must be <= end", path: ["end"] }
  );
