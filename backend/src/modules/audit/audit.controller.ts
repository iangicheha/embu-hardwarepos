import { Response } from "express";
import auditService from "./audit.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class AuditController {
  getLogs = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const data = await auditService.getLogs(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number,
        validatedQuery.action as unknown as string | undefined
      );
      successResponse(res, data, "Audit logs retrieved");
    }
  );

  getLogById = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const data = await auditService.getLogById(
        getParam(req.params.id)
      );
      successResponse(res, data, "Audit log retrieved");
    }
  );

  getUserLogs = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const data = await auditService.getUserLogs(
        getParam(req.params.userId),
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number
      );
      successResponse(res, data, "User audit logs retrieved");
    }
  );
}

export default new AuditController();
