import { describe, it, expect, vi, beforeEach } from "vitest";

describe("env module", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reads values from environment", async () => {
    process.env.APP_ID = "test-app";
    process.env.APP_SECRET = "test-secret";
    process.env.DATABASE_URL = "mysql://test";
    process.env.KIMI_AUTH_URL = "https://auth.test";
    process.env.KIMI_OPEN_URL = "https://open.test";
    process.env.OWNER_UNION_ID = "owner-123";
    process.env.NODE_ENV = "development";

    const { env } = await import("./env");
    expect(env.appId).toBe("test-app");
    expect(env.ownerUnionId).toBe("owner-123");
    expect(env.isProduction).toBe(false);
  });

  it("defaults optional OWNER_UNION_ID to empty string", async () => {
    process.env.APP_ID = "test";
    process.env.APP_SECRET = "test";
    process.env.DATABASE_URL = "mysql://test";
    process.env.KIMI_AUTH_URL = "https://auth.test";
    process.env.KIMI_OPEN_URL = "https://open.test";
    delete process.env.OWNER_UNION_ID;

    const { env } = await import("./env");
    expect(env.ownerUnionId).toBe("");
  });
});
