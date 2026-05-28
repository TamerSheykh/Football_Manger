import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  medicalRecords,
  injuries,
  healthMetrics,
  players,
} from "@db/schema";

export const medicalRouter = createRouter({
  // Medical Records
  listRecords: publicQuery
    .input(z.object({ playerId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.playerId) {
        return db
          .select()
          .from(medicalRecords)
          .where(eq(medicalRecords.playerId, input.playerId));
      }
      return db.select().from(medicalRecords);
    }),

  createRecord: publicQuery
    .input(
      z.object({
        playerId: z.number(),
        examinationDate: z.string(),
        status: z.enum(["cleared", "limited", "not_cleared"]),
        notes: z.string().optional(),
        certificateUrl: z.string().optional(),
        certificateExpiry: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(medicalRecords).values({
        playerId: input.playerId,
        examinationDate: new Date(input.examinationDate),
        status: input.status,
        notes: input.notes,
        certificateUrl: input.certificateUrl,
        certificateExpiry: input.certificateExpiry
          ? new Date(input.certificateExpiry)
          : undefined,
      });
      return { id: Number(result[0].insertId) };
    }),

  updateRecord: publicQuery
    .input(
      z.object({
        id: z.number(),
        examinationDate: z.string().optional(),
        status: z.enum(["cleared", "limited", "not_cleared"]).optional(),
        notes: z.string().optional(),
        certificateUrl: z.string().optional(),
        certificateExpiry: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.examinationDate !== undefined)
        updateData.examinationDate = new Date(data.examinationDate);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.certificateUrl !== undefined)
        updateData.certificateUrl = data.certificateUrl;
      if (data.certificateExpiry !== undefined)
        updateData.certificateExpiry = new Date(data.certificateExpiry);
      await db
        .update(medicalRecords)
        .set(updateData)
        .where(eq(medicalRecords.id, id));
      return { success: true };
    }),

  // Injuries
  listInjuries: publicQuery
    .input(z.object({ playerId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.playerId) {
        return db
          .select()
          .from(injuries)
          .where(eq(injuries.playerId, input.playerId));
      }
      return db.select().from(injuries);
    }),

  createInjury: publicQuery
    .input(
      z.object({
        playerId: z.number(),
        type: z.string().min(1),
        description: z.string().optional(),
        dateOccurred: z.string(),
        recoveryDays: z.number().optional(),
        status: z.enum(["active", "recovering", "healed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(injuries).values({
        playerId: input.playerId,
        type: input.type,
        description: input.description,
        dateOccurred: new Date(input.dateOccurred),
        recoveryDays: input.recoveryDays,
        status: input.status || "active",
      });
      return { id: Number(result[0].insertId) };
    }),

  updateInjury: publicQuery
    .input(
      z.object({
        id: z.number(),
        type: z.string().optional(),
        description: z.string().optional(),
        dateOccurred: z.string().optional(),
        recoveryDays: z.number().optional(),
        status: z.enum(["active", "recovering", "healed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = {};
      if (data.type !== undefined) updateData.type = data.type;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.dateOccurred !== undefined) updateData.dateOccurred = new Date(data.dateOccurred);
      if (data.recoveryDays !== undefined) updateData.recoveryDays = data.recoveryDays;
      if (data.status !== undefined) updateData.status = data.status;
      await db.update(injuries).set(updateData).where(eq(injuries.id, id));
      return { success: true };
    }),

  deleteInjury: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(injuries).where(eq(injuries.id, input.id));
      return { success: true };
    }),

  // Health Metrics
  listHealthMetrics: publicQuery
    .input(z.object({ playerId: z.number() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.playerId) {
        return db
          .select()
          .from(healthMetrics)
          .where(eq(healthMetrics.playerId, input.playerId))
          .orderBy(healthMetrics.recordedAt);
      }
      return db.select().from(healthMetrics).orderBy(healthMetrics.recordedAt);
    }),

  deleteHealthMetric: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(healthMetrics).where(eq(healthMetrics.id, input.id));
      return { success: true };
    }),

  createHealthMetric: publicQuery
    .input(
      z.object({
        playerId: z.number(),
        weight: z.string().optional(),
        restingHr: z.number().optional(),
        cooperDistance: z.string().optional(),
        height: z.string().optional(),
        bloodPressureSys: z.number().optional(),
        bloodPressureDia: z.number().optional(),
        recordedAt: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(healthMetrics).values({
        playerId: input.playerId,
        weight: input.weight || null,
        restingHr: input.restingHr || null,
        cooperDistance: input.cooperDistance || null,
        height: input.height || null,
        bloodPressureSys: input.bloodPressureSys || null,
        bloodPressureDia: input.bloodPressureDia || null,
        recordedAt: new Date(input.recordedAt),
      });
      return { id: Number(result[0].insertId) };
    }),

  // Players with medical status
  listPlayersWithStatus: publicQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, input.teamId));

      const result = [];
      for (const player of teamPlayers) {
        const records = await db
          .select()
          .from(medicalRecords)
          .where(eq(medicalRecords.playerId, player.id))
          .orderBy(medicalRecords.examinationDate)
          .limit(1);

        const playerInjuries = await db
          .select()
          .from(injuries)
          .where(eq(injuries.playerId, player.id));

        const latestHealth = await db
          .select()
          .from(healthMetrics)
          .where(eq(healthMetrics.playerId, player.id))
          .orderBy(healthMetrics.recordedAt)
          .limit(1);

        const activeInjuries = playerInjuries.filter(
          (i) => i.status === "active" || i.status === "recovering"
        );

        // Override medical status based on injuries
        const hasActiveOrRecovering = playerInjuries.some(
          (i) => i.status === "active" || i.status === "recovering"
        );
        const dbStatus = records[0]?.status || "cleared";
        const derivedStatus = hasActiveOrRecovering ? "not_cleared" : dbStatus;
        const latestRecord = records[0]
          ? { ...records[0], status: derivedStatus }
          : hasActiveOrRecovering
            ? { status: "not_cleared" as const, playerId: player.id, examinationDate: null }
            : null;

        result.push({
          player,
          latestRecord,
          activeInjuries,
          latestHealth: latestHealth[0] || null,
        });
      }
      return result;
    }),
});
