import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import swaggerUi from "swagger-ui-express";

import routes from "./routes/index";
import {
  errorHandler,
  notFoundHandler
} from "./middleware/error.middleware";
import { apiLimiter } from "./middleware/rateLimiter.middleware";
import { env } from "./config/env";
import { swaggerSpec } from "./docs/swagger";
import { logger } from "./config/logger";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(compression());
const allowedOrigins = env.FRONTEND_URL.split(",").map((url) => url.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (no origin header), exact matches,
      // and any Vercel preview/branch URL for this project.
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https:\/\/hardwarepos-[a-z0-9-]+\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(apiLimiter);

if (env.IS_PROD) {
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
  });
}

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "hardware-store-backend" });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;