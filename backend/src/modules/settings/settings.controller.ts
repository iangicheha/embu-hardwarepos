import { Response } from "express";
import settingsService from "./settings.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { AuthenticatedRequest } from "../../types/request";

class SettingsController {
  getSettings = catchAsync(
    async (_req: AuthenticatedRequest, res: Response) => {
      const data = await settingsService.getSettings();
      successResponse(res, data, "Settings retrieved");
    }
  );

  updateSettings = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const data = await settingsService.updateSettings(
        req.body,
        req.user!.userId
      );
      successResponse(res, data, "Settings updated");
    }
  );
}

export default new SettingsController();
