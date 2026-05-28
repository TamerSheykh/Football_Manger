import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notifications } from "@db/schema";

export const notificationRouter = createRouter({
  list: publicQuery
    .input(z.object({ userId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.userId) {
        return db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, input.userId))
          .orderBy(desc(notifications.createdAt));
      }
      return db
        .select()
        .from(notifications)
        .orderBy(desc(notifications.createdAt));
    }),

  getUnreadCount: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const all = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, input.userId));
      return all.filter((n) => !n.isRead).length;
    }),

  create: publicQuery
    .input(
      z.object({
        userId: z.number(),
        type: z.enum(["warning", "error", "info"]),
        title: z.string().min(1),
        message: z.string().min(1),
        playerId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(notifications).values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        playerId: input.playerId,
      });
      return { id: Number(result[0].insertId) };
    }),

  markAsRead: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, input.id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(notifications).where(eq(notifications.id, input.id));
      return { success: true };
    }),

  markAllAsRead: publicQuery
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const all = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, input.userId));
      for (const n of all) {
        if (!n.isRead) {
          await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, n.id));
        }
      }
      return { success: true };
    }),
});
