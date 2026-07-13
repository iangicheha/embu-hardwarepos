import { Response, NextFunction } from "express";
import { writeAuditLog } from "../utils/auditLog";
import { logger } from "../config/logger";
import { AuthenticatedRequest } from "../types/request";

export const auditMiddleware = (
  action: string
) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    res.on("finish", () => {
      if (res.statusCode >= 400) {
        return;
      }

      writeAuditLog(
        req.user?.userId,
        action,
        `${req.method} ${req.originalUrl}`
      ).catch((error) => {
        logger.error("Failed to write audit log", error);
      });
    });

    next();
  };
};
