import { z } from "zod";

export const updateUserSchema = z.object({
    fullName: z.string().min(3).max(100).optional(),
    phone: z.string().max(20).optional(),
    role: z.enum(["admin", "worker"]).optional()
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
