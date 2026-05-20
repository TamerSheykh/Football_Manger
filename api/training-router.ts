import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { trainingSessions, attendance, players } from "@db/schema";

export const trainingRouter = createRouter({
  list: publicQuery
    .input(z.object({ teamId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.teamId) {
        return db
          .select()
          .from(trainingSessions)
          .where(eq(trainingSessions.teamId, input.teamId));
      }
      return db.select().from(trainingSessions);
    }),

  create: publicQuery
    .input(
      z.object({
        teamId: z.number(),
        name: z.string().min(1),
        sessionDate: z.string(),
        sessionTime: z.string().optional(),
        location: z.string().optional(),
        type: z.enum(["general", "tactical", "physical", "technical"]),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(trainingSessions).values({
        teamId: input.teamId,
        name: input.name,
        sessionDate: new Date(input.sessionDate),
        sessionTime: input.sessionTime,
        location: input.location,
        type: input.type,
        description: input.description,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        sessionDate: z.string().optional(),
        sessionTime: z.string().optional(),
        location: z.string().optional(),
        type: z.enum(["general", "tactical", "physical", "technical"]).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.sessionDate !== undefined) updateData.sessionDate = new Date(data.sessionDate);
      if (data.sessionTime !== undefined) updateData.sessionTime = data.sessionTime;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.description !== undefined) updateData.description = data.description;
      await db.update(trainingSessions).set(updateData).where(eq(trainingSessions.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(trainingSessions).where(eq(trainingSessions.id, input.id));
      return { success: true };
    }),

  getAttendance: publicQuery
    .input(z.object({ trainingId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const records = await db
        .select()
        .from(attendance)
        .where(eq(attendance.trainingId, input.trainingId));
      return records;
    }),

  saveAttendance: publicQuery
    .input(
      z.array(
        z.object({
          trainingId: z.number(),
          playerId: z.number(),
          status: z.enum(["present", "absent", "late"]),
          notes: z.string().optional(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      for (const record of input) {
        const existing = await db
          .select()
          .from(attendance)
          .where(
            eq(attendance.trainingId, record.trainingId)
          )
          .limit(1);
        
        const existingRecord = existing.find(
          (e) => e.playerId === record.playerId
        );
        
        if (existingRecord) {
          await db
            .update(attendance)
            .set({ status: record.status, notes: record.notes })
            .where(eq(attendance.id, existingRecord.id));
        } else {
          await db.insert(attendance).values({
            trainingId: record.trainingId,
            playerId: record.playerId,
            status: record.status,
            notes: record.notes,
          });
        }
      }
      return { success: true };
    }),

  getPlayersForAttendance: publicQuery
    .input(z.object({ trainingId: z.number(), teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const allPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, input.teamId));
      
      const attendanceRecords = await db
        .select()
        .from(attendance)
        .where(eq(attendance.trainingId, input.trainingId));

      return allPlayers.map((player) => {
        const record = attendanceRecords.find((a) => a.playerId === player.id);
        return {
          player,
          status: record?.status || "present" as const,
          notes: record?.notes || "",
        };
      });
    }),
});
