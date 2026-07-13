import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/request";

export const authorize =
  (roles: Array<"admin" | "worker">) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Forbidden"
      });
      return;
    }

    next();
  };
