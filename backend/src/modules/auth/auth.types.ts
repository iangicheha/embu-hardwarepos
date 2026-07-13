import { UserRole } from "../../types/common.types";

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  fullName: string;
  phone?: string;
  email: string;
  password: string;
  role?: UserRole;
}
