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
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(apiLimiter);

if (env.IS_PROD) {
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
  });
}

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
