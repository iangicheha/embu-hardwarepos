import { Response } from "express";
import usersService from "./users.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AppError } from "../../utils/AppError";
import { AuthenticatedRequest } from "../../types/request";

class UsersController {
  getUsers = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await usersService.getUsers(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number,
        validatedQuery.search as unknown as string | undefined
      );
      successResponse(res, result, "Users retrieved");
    }
  );

  getUserById = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const user = await usersService.getUserById(
        getParam(req.params.id)
      );
      successResponse(res, user, "User retrieved");
    }
  );

  createUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const user = await usersService.createUser(
        req.body,
        req.user!.userId
      );
      successResponse(res, user, "User created", 201);
    }
  );

  updateUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const user = await usersService.updateUser(
        getParam(req.params.id),
        req.body,
        req.user!.userId
      );
      successResponse(res, user, "User updated");
    }
  );

  changePassword = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      // Self-service: a worker can change their own password without admin.
      const target = getParam(req.params.id);
      if (target !== req.user!.userId) {
        // delegate to the service for the actual role check
        await usersService.changePassword(
          target,
          req.body,
          req.user!.userId,
          req.user!.role
        );
      } else {
        await usersService.changePassword(
          target,
          req.body,
          req.user!.userId,
          req.user!.role
        );
      }
      successResponse(res, null, "Password changed");
    }
  );

  deactivateUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      if (getParam(req.params.id) === req.user!.userId) {
        throw new AppError(
          "You cannot deactivate your own account",
          400
        );
      }
      await usersService.deactivateUser(
        getParam(req.params.id),
        req.user!.userId
      );
      successResponse(res, null, "User deactivated");
    }
  );

  activateUser = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await usersService.activateUser(
        getParam(req.params.id),
        req.user!.userId
      );
      successResponse(res, null, "User activated");
    }
  );
}

export default new UsersController();
