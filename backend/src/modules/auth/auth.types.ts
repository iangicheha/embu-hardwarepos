import { UserRole } from "@prisma/client";

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  fullName: string;
  username: string;
  phone?: string;
  email: string;
  password: string;
  role?: UserRole;
}