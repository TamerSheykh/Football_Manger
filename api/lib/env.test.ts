import { describe, it, expect, vi, beforeEach } from "vitest";

describe("env module", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reads values from environment", async () => {
    process.env.APP_ID = "test-app";
    process.env.APP_SECRET = "test-secret";
    process.env.DATABASE_URL = "mysql://test";
    process.env.NODE_ENV = "development";

    const { env } = await import("./env");
    expect(env.appId).toBe("test-app");
    expect(env.isProduction).toBe(false);
  });

  it("defaults optional fields", async () => {
    process.env.APP_ID = "test";
    process.env.APP_SECRET = "test";
    process.env.DATABASE_URL = "mysql://test";

    const { env } = await import("./env");
    expect(env.databaseUrl).toBe("mysql://test");
  });
});
