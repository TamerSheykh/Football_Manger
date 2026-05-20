import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "football-manager-secret-key-2024";

export const customAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["coach", "medical"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new Error("Email already registered");
      }
      const passwordHash = await bcrypt.hash(input.password, 10);
      const result = await db.insert(users).values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      });
      const userId = Number(result[0].insertId);
      const token = jwt.sign({ userId, email: input.email, role: input.role }, JWT_SECRET, {
        expiresIn: "30d",
      });
      return { token, user: { id: userId, name: input.name, email: input.email, role: input.role } };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const found = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (found.length === 0) {
        throw new Error("Invalid email or password");
      }
      const user = found[0];
      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const authHeader = ctx.req.headers.get("x-auth-token");
    if (!authHeader) {
      return null;
    }
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
      if (found.length === 0) return null;
      const user = found[0];
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    } catch {
      return null;
    }
  }),
});
