import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma, { TransactionClient } from "../../database/prisma";
import jwtService from "../../services/jwt.service";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { writeAuditLog } from "../../utils/auditLog";
import { logger } from "../../config/logger";

import {
  LoginDto,
  RegisterDto,
  JwtPayload
} from "./auth.types";

const MAX_CONCURRENT_SESSIONS = 5;

const getRefreshExpiry = () => {
  const expiresAt = new Date();
  // JWT_REFRESH_EXPIRES_IN validated to a duration string at boot
  const m = env.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([a-z]+)$/);
  if (!m) throw new AppError("Invalid refresh token expiry configuration", 500);
  const n = Number(m[1]);
  const unit = m[2];
  const ms: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
    y: 31_536_000_000
  };
  expiresAt.setTime(expiresAt.getTime() + n * (ms[unit] ?? ms.d));
  return expiresAt;
};

class AuthService {
  private hashRefreshToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async storeRefreshToken(
    tx: TransactionClient | typeof prisma,
    userId: string,
    token: string
  ) {
    await tx.refreshToken.create({
      data: {
        token: this.hashRefreshToken(token),
        userId,
        expiresAt: getRefreshExpiry()
      }
    });
  }

  private async pruneOldSessions(userId: string) {
    const sessions = await prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });
    if (sessions.length < MAX_CONCURRENT_SESSIONS) return;
    const toDelete = sessions.slice(MAX_CONCURRENT_SESSIONS - 1);
    await prisma.refreshToken.deleteMany({
      where: { id: { in: toDelete.map((s) => s.id) } }
    });
  }

  async register(data: RegisterDto) {
    const email = data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      throw new AppError("User with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(
      data.password,
      env.BCRYPT_SALT_ROUNDS
    );

    const user = await prisma.$transaction(async (tx: TransactionClient) => {
      const createdUser = await tx.user.create({
        data: {
          fullName: data.fullName.trim(),
          email,
          phone: data.phone,
          passwordHash: hashedPassword,
          role: data.role ?? "worker"
        }
      });

      await writeAuditLog(
        createdUser.id,
        "USER_REGISTERED",
        `New user registered: ${createdUser.email}`
      );

      return createdUser;
    });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwtService.generateAccessToken(payload);
    const refreshToken = jwtService.generateRefreshToken(payload);

    await this.storeRefreshToken(prisma, user.id, refreshToken);
    await this.pruneOldSessions(user.id);

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }

  async login(data: LoginDto) {
    const email = data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await writeAuditLog(undefined, "FAILED_LOGIN", `Unknown email: ${email}`);
      throw new AppError("Invalid credentials", 401);
    }

    if (!user.isActive) {
      throw new AppError("Account is deactivated", 403);
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      await writeAuditLog(
        user.id,
        "FAILED_LOGIN",
        "Incorrect password"
      );
      throw new AppError("Invalid credentials", 401);
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwtService.generateAccessToken(payload);
    const refreshToken = jwtService.generateRefreshToken(payload);

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
      await this.storeRefreshToken(tx, user.id, refreshToken);
    });
    await this.pruneOldSessions(user.id);

    await writeAuditLog(user.id, "USER_LOGIN", "User logged in successfully");

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      accessToken,
      refreshToken
    };
  }

  async refreshToken(token: string) {
    const payload = jwtService.verifyRefreshToken(token);
    const hashed = this.hashRefreshToken(token);

    const newAccess = jwtService.generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });
    const newRefresh = jwtService.generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });

    const result = await prisma.$transaction(async (tx) => {
      const stored = await tx.refreshToken.findUnique({
        where: { token: hashed }
      });

      if (!stored || stored.expiresAt < new Date()) {
        throw new AppError("Invalid or expired refresh token", 401);
      }

      // Atomic rotation: delete old, insert new
      await tx.refreshToken.delete({ where: { token: hashed } });
      await this.storeRefreshToken(tx, payload.userId, newRefresh);

      return { newAccess, newRefresh };
    });

    return {
      accessToken: result.newAccess,
      refreshToken: result.newRefresh
    };
  }

  async logout(userId: string, currentRefreshToken?: string) {
    if (currentRefreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { userId, token: this.hashRefreshToken(currentRefreshToken) }
      });
    } else {
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    await writeAuditLog(userId, "USER_LOGOUT", "User logged out");
    return true;
  }
}

export default new AuthService();

// silence unused-import warnings
void logger;
