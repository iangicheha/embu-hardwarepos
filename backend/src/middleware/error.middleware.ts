import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";
import { env } from "../config/env";

const prismaToAppError = (err: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (err.code) {
    case "P2002":
      return new AppError(
        `A record with this value already exists (${err.meta?.target ?? "field"})`,
        409
      );
    case "P2003":
      return new AppError(
        `Referenced record does not exist (${err.meta?.field_name ?? "field"})`,
        400
      );
    case "P2025":
      return new AppError("Record not found", 404);
    default:
      return new AppError("Database error", 500);
  }
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
};

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const appErr = prismaToAppError(err);
    if (appErr.statusCode >= 500) logger.error(err);
    return res.status(appErr.statusCode).json({
      success: false,
      status: appErr.status,
      message: appErr.message
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error("Prisma validation error", err);
    return res.status(400).json({
      success: false,
      message: "Invalid data"
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(err);
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message
    });
  }

  // Respect status codes set by body-parser / express.json (e.g. 413
  // "request entity too large" or 400 "malformed JSON"), so they don't
  // get reported as 500 Internal Server Error.
  const expressErr = err as Error & { status?: number; statusCode?: number; type?: string };
  if (expressErr.status === 413 || expressErr.type === "entity.too.large") {
    logger.warn("Payload too large", { message: err.message });
    return res.status(413).json({
      success: false,
      message: "Payload too large"
    });
  }
  if (expressErr.status === 400 || expressErr.type === "entity.parse.failed") {
    logger.warn("Bad request", { message: err.message });
    return res.status(400).json({
      success: false,
      message: "Bad request"
    });
  }

  logger.error("Unhandled error", err);

  return res.status(500).json({
    success: false,
    message: env.IS_PROD ? "Internal Server Error" : err.message
  });
};
