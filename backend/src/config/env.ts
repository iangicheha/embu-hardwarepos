import dotenv from "dotenv";

dotenv.config();

const DURATION_RE = /^\d+(ms|s|m|h|d|w|y)$/;

function requiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (typeof value === "undefined") {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
}

function parseDuration(key: string, fallback: string): string {
  const v = process.env[key] ?? fallback;
  if (!DURATION_RE.test(v)) {
    throw new Error(
      `Environment variable ${key} must match /\\d+(ms|s|m|h|d|w|y)/ — got "${v}"`
    );
  }
  return v;
}

function parseSaltRounds(value: string | undefined): number {
  const n = Number(value ?? 12);
  if (!Number.isFinite(n) || n < 10 || n > 15) {
    throw new Error(
      `BCRYPT_SALT_ROUNDS must be an integer between 10 and 15 — got "${value}"`
    );
  }
  return n;
}

const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PROD = NODE_ENV === "production";

const JWT_SECRET = requiredEnv("JWT_SECRET");
const JWT_REFRESH_SECRET = requiredEnv("JWT_REFRESH_SECRET");

if (IS_PROD) {
  if (JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  if (JWT_REFRESH_SECRET.length < 32) {
    throw new Error(
      "JWT_REFRESH_SECRET must be at least 32 characters in production"
    );
  }
  if (JWT_SECRET === JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must differ");
  }
}

const FRONTEND_URL = IS_PROD
  ? requiredEnv("FRONTEND_URL")
  : process.env.FRONTEND_URL ?? "http://localhost:3000";

export const env = {
  NODE_ENV,
  IS_PROD,
  PORT: requiredEnv("PORT", "3000"),
  DATABASE_URL: requiredEnv("DATABASE_URL"),
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: parseDuration("JWT_EXPIRES_IN", "1d"),
  JWT_REFRESH_EXPIRES_IN: parseDuration("JWT_REFRESH_EXPIRES_IN", "7d"),
  BCRYPT_SALT_ROUNDS: parseSaltRounds(process.env.BCRYPT_SALT_ROUNDS),
  FRONTEND_URL,
  JWT_ISSUER: process.env.JWT_ISSUER ?? "hardware-api",
  JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? "hardware-clients",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM
};

export const isEmailConfigured = () =>
  Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASS &&
      env.SMTP_FROM
  );
