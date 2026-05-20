import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { matches, playerMatchStats } from "@db/schema";

export const matchRouter = createRouter({
  list: publicQuery
    .input(z.object({ teamId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.teamId) {
        return db.select().from(matches).where(eq(matches.teamId, input.teamId));
      }
      return db.select().from(matches);
    }),

  create: publicQuery
    .input(
      z.object({
        teamId: z.number(),
        opponent: z.string().min(1),
        matchDate: z.string(),
        scoreHome: z.number().optional(),
        scoreAway: z.number().optional(),
        isHome: z.boolean().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["scheduled", "played", "cancelled"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(matches).values({
        teamId: input.teamId,
        opponent: input.opponent,
        matchDate: new Date(input.matchDate),
        scoreHome: input.scoreHome ?? 0,
        scoreAway: input.scoreAway ?? 0,
        isHome: input.isHome ?? true,
        location: input.location,
        notes: input.notes,
        status: input.status || "scheduled",
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        opponent: z.string().optional(),
        matchDate: z.string().optional(),
        scoreHome: z.number().optional(),
        scoreAway: z.number().optional(),
        isHome: z.boolean().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["scheduled", "played", "cancelled"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.opponent !== undefined) updateData.opponent = data.opponent;
      if (data.matchDate !== undefined) updateData.matchDate = new Date(data.matchDate);
      if (data.scoreHome !== undefined) updateData.scoreHome = data.scoreHome;
      if (data.scoreAway !== undefined) updateData.scoreAway = data.scoreAway;
      if (data.isHome !== undefined) updateData.isHome = data.isHome;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status !== undefined) updateData.status = data.status;
      await db.update(matches).set(updateData).where(eq(matches.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(matches).where(eq(matches.id, input.id));
      return { success: true };
    }),

  getPlayerStats: publicQuery
    .input(z.object({ matchId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(playerMatchStats)
        .where(eq(playerMatchStats.matchId, input.matchId));
    }),

  savePlayerStats: publicQuery
    .input(
      z.array(
        z.object({
          matchId: z.number(),
          playerId: z.number(),
          goals: z.number().optional(),
          assists: z.number().optional(),
          yellowCards: z.number().optional(),
          redCards: z.number().optional(),
          minutesPlayed: z.number().optional(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      for (const stat of input) {
        const existing = await db
          .select()
          .from(playerMatchStats)
          .where(eq(playerMatchStats.matchId, stat.matchId));
        
        const existingRecord = existing.find((e) => e.playerId === stat.playerId);
        
        if (existingRecord) {
          await db
            .update(playerMatchStats)
            .set({
              goals: stat.goals ?? 0,
              assists: stat.assists ?? 0,
              yellowCards: stat.yellowCards ?? 0,
              redCards: stat.redCards ?? 0,
              minutesPlayed: stat.minutesPlayed ?? 0,
            })
            .where(eq(playerMatchStats.id, existingRecord.id));
        } else {
          await db.insert(playerMatchStats).values({
            matchId: stat.matchId,
            playerId: stat.playerId,
            goals: stat.goals ?? 0,
            assists: stat.assists ?? 0,
            yellowCards: stat.yellowCards ?? 0,
            redCards: stat.redCards ?? 0,
            minutesPlayed: stat.minutesPlayed ?? 0,
          });
        }
      }
      return { success: true };
    }),
});
