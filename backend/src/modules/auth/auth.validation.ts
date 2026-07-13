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

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["admin", "worker"]).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72)
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1)
});

export const logoutSchema = z
  .object({
    refreshToken: z.string().min(1).optional()
  })
  .optional();
