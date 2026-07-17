import { z } from "zod";

export const createUserSchema = z.object({
    fullName: z.string().min(3).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    password: z.string().min(6),
    role: z.enum(["admin", "worker"]).optional()
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
    fullName: z.string().min(3).max(100).optional(),
    phone: z.string().max(20).optional(),
    role: z.enum(["admin", "worker"]).optional()
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6).optional(),
    newPassword: z.string().min(6)
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    role: z.enum(["admin", "worker"]).optional()
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;