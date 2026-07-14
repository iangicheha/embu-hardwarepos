import { Request, Response } from "express";
import authService from "./auth.service";

class AuthController {
  async register(
    req: Request,
    res: Response
  ) {
    try {
      const result =
        await authService.register(req.body);

      res.status(201).json({
        success: true,
        message:
          "User registered successfully",
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async login(
    req: Request,
    res: Response
  ) {
    try {
      const result =
        await authService.login(req.body);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async refreshToken(
    req: Request,
    res: Response
  ) {
    try {
      const { refreshToken } = req.body;

      const result =
        await authService.refreshToken(
          refreshToken
        );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  async logout(
    req: Request,
    res: Response
  ) {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
        return;
      }

      await authService.logout(
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: "Logout successful"
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new AuthController();
