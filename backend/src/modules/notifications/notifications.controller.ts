import { Response } from "express";
import notificationService from "../../services/notification.service";
import { catchAsync } from "../../utils/catchAsync";
import { successResponse } from "../../utils/apiResponse";
import { getParam } from "../../utils/getParam";
import { AuthenticatedRequest } from "../../types/request";

class NotificationsController {
  getNotifications = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const validatedQuery = (req as any).validatedQuery || req.query;
      const result = await notificationService.getNotifications(
        validatedQuery.page as unknown as number,
        validatedQuery.limit as unknown as number
      );
      successResponse(res, result, "Notifications retrieved");
    }
  );

  markAsRead = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      const notification = await notificationService.markAsRead(
        getParam(req.params.id)
      );
      successResponse(res, notification, "Notification marked as read");
    }
  );

  deleteNotification = catchAsync(
    async (req: AuthenticatedRequest, res: Response) => {
      await notificationService.deleteNotification(
        getParam(req.params.id)
      );
      successResponse(res, null, "Notification deleted");
    }
  );
}

export default new NotificationsController();
