import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../modules/auth/auth.types";

class JwtService {
  private get baseOptions(): SignOptions {
    return {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    };
  }

  private get verifyOptions(): VerifyOptions {
    return {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    };
  }

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      ...this.baseOptions,
      expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
    });
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      ...this.baseOptions,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"]
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET, this.verifyOptions) as unknown as JwtPayload;
  }

  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, this.verifyOptions) as unknown as JwtPayload;
  }
}

export default new JwtService();
