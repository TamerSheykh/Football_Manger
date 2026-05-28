import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { createRouter, publicQuery, coachQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { teams, teamMembers } from "@db/schema";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const teamRouter = createRouter({
  list: publicQuery
    .input(z.object({ userId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.userId) {
        // own teams + teams the user joined via invite
        const memberTeams = await db
          .select({ teamId: teamMembers.teamId })
          .from(teamMembers)
          .where(eq(teamMembers.userId, input.userId));
        const memberIds = memberTeams.map((m) => m.teamId);
        const owned = await db.select().from(teams).where(eq(teams.userId, input.userId));
        if (memberIds.length > 0) {
          const joined = await db.select().from(teams).where(inArray(teams.id, memberIds));
          const seen = new Set(owned.map((t) => t.id));
          return [...owned, ...joined.filter((t) => !seen.has(t.id))];
        }
        return owned;
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

  getByInviteCode: publicQuery
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(teams).where(eq(teams.inviteCode, input.code)).limit(1);
      return result[0] ?? null;
    }),

  create: coachQuery
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
      let inviteCode = generateInviteCode();
      // ensure uniqueness
      while ((await db.select().from(teams).where(eq(teams.inviteCode, inviteCode)).limit(1)).length > 0) {
        inviteCode = generateInviteCode();
      }
      const result = await db.insert(teams).values({
        name: input.name,
        category: input.category,
        ageGroup: input.ageGroup,
        color: input.color || "#96f7b9",
        description: input.description,
        userId: input.userId,
        inviteCode,
      });
      return { id: Number(result[0].insertId), inviteCode };
    }),

  update: coachQuery
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

  delete: coachQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(teamMembers).where(eq(teamMembers.teamId, input.id));
      await db.delete(teams).where(eq(teams.id, input.id));
      return { success: true };
    }),

  joinByInvite: publicQuery
    .input(z.object({ code: z.string(), userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const team = await db.select().from(teams).where(eq(teams.inviteCode, input.code)).limit(1);
      if (!team[0]) return { success: false, error: "Неверный код" };
      // check if already a member
      const existing = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team[0].id),
            eq(teamMembers.userId, input.userId)
          )
        )
        .limit(1);
      if (existing[0]) return { success: false, error: "Вы уже в команде" };
      await db.insert(teamMembers).values({ teamId: team[0].id, userId: input.userId });
      return { success: true, team: team[0] };
    }),
});
