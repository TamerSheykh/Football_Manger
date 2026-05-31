import { describe, it, expect } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ErrorMessages } from "@contracts/constants";

type MockUser = { id: number; role: string; name: string; email: string };
type MockContext = { user?: MockUser };

const t = initTRPC.context<MockContext>().create({ transformer: superjson });

const requireAuth = t.middleware(async (opts) => {
  if (!opts.ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: ErrorMessages.unauthenticated });
  }
  return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
});

const requireRole = (role: string) =>
  t.middleware(async (opts) => {
    if (!opts.ctx.user || opts.ctx.user.role !== role) {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user } });
  });

const authedQuery = t.procedure.use(requireAuth);
const coachQuery = authedQuery.use(requireRole("coach"));
const medicalQuery = authedQuery.use(requireRole("medical"));

const testRouter = t.router({
  testPublic: t.procedure.query(() => "ok"),
  testAuthed: authedQuery.query(() => "authed"),
  testCoach: coachQuery.query(() => "coach"),
  testMedical: medicalQuery.query(() => "medical"),
});

describe("middleware guards", () => {
  it("authedQuery rejects unauthenticated requests", async () => {
    const caller = testRouter.createCaller({} as MockContext);
    await expect(caller.testAuthed()).rejects.toThrow(TRPCError);
    await expect(caller.testAuthed()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("coachQuery rejects medical user", async () => {
    const caller = testRouter.createCaller({
      user: { id: 1, role: "medical", name: "Doc", email: "doc@test.com" },
    });
    await expect(caller.testCoach()).rejects.toThrow(TRPCError);
    await expect(caller.testCoach()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("coachQuery allows coach user", async () => {
    const caller = testRouter.createCaller({
      user: { id: 2, role: "coach", name: "Coach", email: "coach@test.com" },
    });
    await expect(caller.testCoach()).resolves.toBe("coach");
  });

  it("medicalQuery rejects coach user", async () => {
    const caller = testRouter.createCaller({
      user: { id: 2, role: "coach", name: "Coach", email: "coach@test.com" },
    });
    await expect(caller.testMedical()).rejects.toThrow(TRPCError);
    await expect(caller.testMedical()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
