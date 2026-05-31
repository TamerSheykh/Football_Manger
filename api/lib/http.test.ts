import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpClient } from "./http";

describe("HttpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds URL with query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpClient("https://api.example.com");
    await client.get("/test", { foo: "bar", num: 42 });

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("https://api.example.com/test");
    expect(calledUrl).toContain("foo=bar");
    expect(calledUrl).toContain("num=42");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Not found" }), { status: 404 })));

    const client = new HttpClient("https://api.example.com");
    await expect(client.get("/test")).rejects.toThrow("Not found");
  });
});
