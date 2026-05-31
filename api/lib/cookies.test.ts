import { describe, it, expect } from "vitest";
import { getSessionCookieOptions } from "./cookies";

describe("getSessionCookieOptions", () => {
  it("returns secure=false, sameSite=Lax for localhost", () => {
    const headers = new Headers({ host: "localhost:3000" });
    const opts = getSessionCookieOptions(headers);
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe("Lax");
  });

  it("returns secure=true, sameSite=None for non-localhost", () => {
    const headers = new Headers({ host: "example.com" });
    const opts = getSessionCookieOptions(headers);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe("None");
  });
});
