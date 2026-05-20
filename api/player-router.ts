import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { players, playerMatchStats, attendance, healthMetrics, injuries } from "@db/schema";

export const playerRouter = createRouter({
  list: publicQuery
    .input(z.object({ teamId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.teamId) {
        return db.select().from(players).where(eq(players.teamId, input.teamId));
      }
      return db.select().from(players);
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(players).where(eq(players.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: publicQuery
    .input(
      z.object({
        teamId: z.number(),
        name: z.string().min(1),
        position: z.enum(["GK", "DEF", "MID", "FWD"]),
        birthDate: z.string().optional(),
        height: z.string().optional(),
        weight: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        jerseyNumber: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(players).values({
        teamId: input.teamId,
        name: input.name,
        position: input.position,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        height: input.height ? input.height : undefined,
        weight: input.weight ? input.weight : undefined,
        phone: input.phone,
        email: input.email,
        jerseyNumber: input.jerseyNumber,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        position: z.enum(["GK", "DEF", "MID", "FWD"]).optional(),
        birthDate: z.string().optional(),
        height: z.string().optional(),
        weight: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        jerseyNumber: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.birthDate !== undefined) updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
      if (data.height !== undefined) updateData.height = data.height || null;
      if (data.weight !== undefined) updateData.weight = data.weight || null;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.jerseyNumber !== undefined) updateData.jerseyNumber = data.jerseyNumber;
      await db.update(players).set(updateData).where(eq(players.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(players).where(eq(players.id, input.id));
      return { success: true };
    }),

  getStats: publicQuery
    .input(z.object({ playerId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const stats = await db
        .select()
        .from(playerMatchStats)
        .where(eq(playerMatchStats.playerId, input.playerId));

      const attendances = await db
        .select()
        .from(attendance)
        .where(eq(attendance.playerId, input.playerId));

      const health = await db
        .select()
        .from(healthMetrics)
        .where(eq(healthMetrics.playerId, input.playerId))
        .orderBy(healthMetrics.recordedAt);

      const injuryList = await db
        .select()
        .from(injuries)
        .where(eq(injuries.playerId, input.playerId));

      const totalMatches = stats.length;
      const totalGoals = stats.reduce((s, r) => s + (r.goals || 0), 0);
      const totalAssists = stats.reduce((s, r) => s + (r.assists || 0), 0);
      const totalYellowCards = stats.reduce((s, r) => s + (r.yellowCards || 0), 0);
      const totalRedCards = stats.reduce((s, r) => s + (r.redCards || 0), 0);
      const totalMinutes = stats.reduce((s, r) => s + (r.minutesPlayed || 0), 0);

      const totalAttendances = attendances.length;
      const presentCount = attendances.filter((a) => a.status === "present").length;
      const attendanceRate = totalAttendances > 0 ? presentCount / totalAttendances : 0;

      return {
        totalMatches,
        totalGoals,
        totalAssists,
        totalYellowCards,
        totalRedCards,
        totalMinutes,
        attendanceRate,
        totalAttendances,
        presentCount,
        healthMetrics: health,
        injuries: injuryList,
      };
    }),
});
