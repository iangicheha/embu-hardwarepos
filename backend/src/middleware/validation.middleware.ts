import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

const sendValidationError = (
  res: Response,
  result: { error: { format: () => unknown } }
) => {
  res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: result.error.format()
  });
};

export const validate = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      sendValidationError(res, result);
      return;
    }

    req.body = result.data;
    next();
  };
};

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      sendValidationError(res, result);
      return;
    }

    // Store validated query data in a custom property instead of modifying read-only req.query
    (req as any).validatedQuery = result.data;
    next();
  };
};
