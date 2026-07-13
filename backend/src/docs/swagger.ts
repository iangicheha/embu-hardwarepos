import swaggerJsdoc from "swagger-jsdoc";
import { env } from "../config/env";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hardware Store ERP API",
      version: "1.0.0",
      description: "REST API for inventory, orders, auth, and reporting"
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Local development server"
      }
    ]
  },
  apis: ["src/**/*.ts"]
};

export const swaggerSpec = swaggerJsdoc(options);
