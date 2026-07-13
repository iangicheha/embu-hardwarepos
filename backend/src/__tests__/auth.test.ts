import request from "supertest";
import app from "../app";

describe("Auth endpoints", () => {
  it("returns api health", async () => {
    const response = await request(app).get("/api");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
