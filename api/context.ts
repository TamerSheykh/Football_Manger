import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "football-manager-secret-key-2024";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

async function authenticateCustom(headers: Headers): Promise<User | undefined> {
  const authHeader = headers.get("x-auth-token");
  if (!authHeader) return undefined;
  try {
    const decoded = jwt.verify(authHeader, JWT_SECRET) as {
      userId: number;
      email: string;
      role: string;
    };
    const db = getDb();
    const found = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);
    return found[0] || undefined;
  } catch {
    return undefined;
  }
}

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  ctx.user = await authenticateCustom(opts.req.headers);
  return ctx;
}
