import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { teams } from "@db/schema";

export const teamRouter = createRouter({
  list: publicQuery
    .input(z.object({ userId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.userId) {
        return db.select().from(teams).where(eq(teams.userId, input.userId));
      }
      return db.select().from(teams);
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(teams).where(eq(teams.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        ageGroup: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(teams).values({
        name: input.name,
        category: input.category,
        ageGroup: input.ageGroup,
        color: input.color || "#96f7b9",
        description: input.description,
        userId: input.userId,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: z.string().optional(),
        ageGroup: z.string().optional(),
        color: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(teams).set(data).where(eq(teams.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(teams).where(eq(teams.id, input.id));
      return { success: true };
    }),
});
