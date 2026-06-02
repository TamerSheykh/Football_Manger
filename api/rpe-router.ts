import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import crypto from "crypto";
import { createRouter, publicQuery, coachQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { rpeSessions, rpeTokens, players, trainingSessions } from "@db/schema";

function calcWellness(s: { muscleFatigue: number | null; sleep: number | null; stress: number | null; doms: number | null }) {
  const items: number[] = [];
  if (s.muscleFatigue != null) items.push((7 - s.muscleFatigue) / 6 * 100);
  if (s.sleep != null) items.push((s.sleep - 1) / 6 * 100);
  if (s.stress != null) items.push((7 - s.stress) / 6 * 100);
  if (s.doms != null) items.push((7 - s.doms) / 6 * 100);
  if (items.length === 0) return null;
  return Math.round(items.reduce((a, b) => a + b, 0) / items.length);
}

function wellnessZone(score: number | null): "gray" | "green" | "yellow" | "orange" | "red" {
  if (score == null) return "gray";
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  if (score >= 25) return "orange";
  return "red";
}

export const rpeRouter = createRouter({
  // Coach generates RPE tokens for all players in a training session
  generate: coachQuery
    .input(z.object({ trainingId: z.number(), teamId: z.number(), userId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, input.teamId));

      if (teamPlayers.length === 0) {
        return { success: false, error: "Нет игроков в команде" };
      }

      const [session] = await db.insert(rpeSessions).values({
        trainingId: input.trainingId,
        teamId: input.teamId,
        createdBy: input.userId,
      });

      const sessionId = Number(session.insertId);
      const tokens: { playerId: number; playerName: string; token: string }[] = [];

      for (const player of teamPlayers) {
        const token = crypto.randomBytes(32).toString("hex");
        await db.insert(rpeTokens).values({
          sessionId,
          playerId: player.id,
          token,
        });
        tokens.push({ playerId: player.id, playerName: player.name, token });
      }

      return { success: true, sessionId, tokens };
    }),

  // Player submits RPE + wellness (no auth — uses token)
  submit: publicQuery
    .input(z.object({
      token: z.string(),
      rating: z.number().min(0).max(10),
      muscleFatigue: z.number().min(1).max(7).nullable().optional(),
      sleep: z.number().min(1).max(7).nullable().optional(),
      stress: z.number().min(1).max(7).nullable().optional(),
      doms: z.number().min(1).max(7).nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(rpeTokens)
        .where(eq(rpeTokens.token, input.token))
        .limit(1);

      if (!found[0]) return { success: false, error: "Неверный токен" };
      if (found[0].rating !== null) return { success: false, error: "Вы уже отправили оценку" };

      await db
        .update(rpeTokens)
        .set({
          rating: input.rating,
          muscleFatigue: input.muscleFatigue ?? null,
          sleep: input.sleep ?? null,
          stress: input.stress ?? null,
          doms: input.doms ?? null,
          respondedAt: new Date(),
        })
        .where(eq(rpeTokens.id, found[0].id));

      return { success: true };
    }),

  // Get RPE results for a training session
  getResults: coachQuery
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tokens = await db
        .select()
        .from(rpeTokens)
        .where(eq(rpeTokens.sessionId, input.sessionId));

      const playerIds = tokens.map((t) => t.playerId);
      if (playerIds.length === 0) return [];

      const teamPlayers = await db
        .select()
        .from(players)
        .where(inArray(players.id, playerIds));

      const playerMap = new Map(teamPlayers.map((p) => [p.id, p]));

      return tokens.map((t) => ({
        playerId: t.playerId,
        playerName: playerMap.get(t.playerId)?.name ?? "—",
        rating: t.rating,
        muscleFatigue: t.muscleFatigue,
        sleep: t.sleep,
        stress: t.stress,
        doms: t.doms,
        respondedAt: t.respondedAt,
      }));
    }),

  // Get wellness scores with zone classification for a session
  getWellness: coachQuery
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tokens = await db
        .select()
        .from(rpeTokens)
        .where(eq(rpeTokens.sessionId, input.sessionId));

      const playerIds = tokens.map((t) => t.playerId);
      if (playerIds.length === 0) return { session: null, players: [] };

      const [session] = await db
        .select()
        .from(rpeSessions)
        .where(eq(rpeSessions.id, input.sessionId))
        .limit(1);

      const [training] = session
        ? await db
            .select()
            .from(trainingSessions)
            .where(eq(trainingSessions.id, session.trainingId))
            .limit(1)
        : [];

      const teamPlayers = await db
        .select()
        .from(players)
        .where(inArray(players.id, playerIds));

      const playerMap = new Map(teamPlayers.map((p) => [p.id, p]));

      const players = tokens.map((t) => {
        const wellness = calcWellness({
          muscleFatigue: t.muscleFatigue,
          sleep: t.sleep,
          stress: t.stress,
          doms: t.doms,
        });
        return {
          playerId: t.playerId,
          playerName: playerMap.get(t.playerId)?.name ?? "—",
          rating: t.rating,
          wellness,
          zone: wellnessZone(wellness),
          respondedAt: t.respondedAt,
        };
      });

      const responded = players.filter((p) => p.respondedAt);
      const avgWellness = responded.length
        ? Math.round(responded.reduce((s, p) => s + (p.wellness ?? 0), 0) / responded.length)
        : null;

      return {
        session: {
          id: session?.id,
          trainingName: training?.name ?? null,
          trainingDate: training?.sessionDate ?? null,
          totalPlayers: players.length,
          responded: responded.length,
          avgWellness,
        },
        players,
      };
    }),

  // Get RPE sessions for a team (for showing status on calendar)
  getSessionsByTeam: coachQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const sessions = await db
        .select()
        .from(rpeSessions)
        .where(eq(rpeSessions.teamId, input.teamId));

      if (sessions.length === 0) return [];

      const ids = sessions.map((s) => s.id);
      const tokens = await db
        .select()
        .from(rpeTokens)
        .where(inArray(rpeTokens.sessionId, ids));

      const tokenMap = new Map<number, typeof tokens>();
      for (const t of tokens) {
        const arr = tokenMap.get(t.sessionId) ?? [];
        arr.push(t);
        tokenMap.set(t.sessionId, arr);
      }

      return sessions.map((s) => ({
        sessionId: s.id,
        trainingId: s.trainingId,
        total: tokenMap.get(s.id)?.length ?? 0,
        responded: tokenMap.get(s.id)?.filter((t) => t.rating !== null).length ?? 0,
      }));
    }),

  // Check token validity (for the public form page)
  checkToken: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const found = await db
        .select()
        .from(rpeTokens)
        .where(eq(rpeTokens.token, input.token))
        .limit(1);

      if (!found[0]) return { valid: false };
      const player = await db
        .select()
        .from(players)
        .where(eq(players.id, found[0].playerId))
        .limit(1);

      return {
        valid: true,
        playerName: player[0]?.name ?? "—",
        alreadySubmitted: found[0].rating !== null,
      };
    }),
});
