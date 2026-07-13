import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters (bcrypt limit)")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: "Password must contain a letter and a digit"
  });

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Invalid email");

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone")
  .optional();

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["admin", "worker"]).default("worker")
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: phoneSchema,
    role: z.enum(["admin", "worker"]).optional()
  })
  .refine(
    (d) =>
      d.fullName !== undefined ||
      d.phone !== undefined ||
      d.role !== undefined,
    { message: "At least one field must be provided" }
  );

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72).optional(),
    newPassword: passwordSchema
  })
  .refine(
    (d) => d.currentPassword !== undefined || d.newPassword.length >= 8,
    { message: "newPassword too weak" }
  );

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional()
});
