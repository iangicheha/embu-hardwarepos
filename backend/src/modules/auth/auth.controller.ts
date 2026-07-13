import { Response } from "express";
import authService from "./auth.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { AuthenticatedRequest } from "../../types/request";

class AuthController {
  register = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const result = await authService.register(req.body);
      successResponse(res, result, "User registered successfully", 201);
    }
  );

  login = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const result = await authService.login(req.body);
    successResponse(res, result, "Login successful");
  });

  refreshToken = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      successResponse(res, result, "Token refreshed");
    }
  );

  logout = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      if (!req.user) {
        throw new Error("User not authenticated");
      }
      const refreshToken = req.body?.refreshToken as string | undefined;
      await authService.logout(req.user.userId, refreshToken);
      successResponse(res, null, "Logout successful");
    }
  );
}

export default new AuthController();
