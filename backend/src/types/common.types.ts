import { UserRole } from "@prisma/client";
export interface JwtPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
    search?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

export interface AuthenticatedUser{
    userId: string;
    email: string;
    role: UserRole;
}