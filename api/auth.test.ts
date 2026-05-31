import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

const JWT_SECRET = "football-manager-secret-key-2024";

describe("JWT auth", () => {
  it("signs and verifies a valid token", () => {
    const payload = { userId: 1, email: "test@test.com", role: "coach" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
    const decoded = jwt.verify(token, JWT_SECRET) as typeof payload;
    expect(decoded.userId).toBe(1);
    expect(decoded.email).toBe("test@test.com");
    expect(decoded.role).toBe("coach");
  });

  it("rejects token with invalid signature", () => {
    const payload = { userId: 1, email: "test@test.com", role: "coach" };
    const token = jwt.sign(payload, "wrong-secret");
    expect(() => jwt.verify(token, JWT_SECRET)).toThrow();
  });
});
