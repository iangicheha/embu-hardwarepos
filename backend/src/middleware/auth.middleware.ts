import { Response, NextFunction } from "express";
import jwtService from "../services/jwt.service";
import prisma from "../database/prisma";
import { AppError } from "../utils/AppError";
import { AuthenticatedRequest } from "../types/request";

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AppError("Authorization header missing", 401);
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AppError("Invalid authorization scheme", 401);
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new AppError("Invalid or expired token", 401);
    }

    const payload = jwtService.verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, role: true }
    });

    if (!user || !user.isActive) {
      throw new AppError("Account is inactive or not found", 401);
    }

    // Always honour the *current* role from the DB, not the JWT claim,
    // so a demoted admin loses access immediately on the next request.
    req.user = {
      userId: user.id,
      email: payload.email,
      role: user.role
    };
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Invalid or expired token", 401));
  }
};
