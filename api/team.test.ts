import { describe, it, expect } from "vitest";
import { generateInviteCode } from "./team-router";

describe("generateInviteCode", () => {
  it("generates 6-character uppercase alphanumeric code", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("generates unique codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});
