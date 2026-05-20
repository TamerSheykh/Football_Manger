import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  players,
  playerMatchStats,
  attendance,
  healthMetrics,
  matches,
  trainingSessions,
  injuries,
} from "@db/schema";

export const analyticsRouter = createRouter({
  // KPI Radar data for a player
  getPlayerKpi: publicQuery
    .input(z.object({ playerId: z.number(), teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const player = await db
        .select()
        .from(players)
        .where(eq(players.id, input.playerId))
        .limit(1);

      if (!player[0]) return null;

      const stats = await db
        .select()
        .from(playerMatchStats)
        .where(eq(playerMatchStats.playerId, input.playerId));

      const attendances = await db
        .select()
        .from(attendance)
        .where(eq(attendance.playerId, input.playerId));

      // Get all team players for normalization
      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, input.teamId));

      // Calculate player values
      const totalGoals = stats.reduce((s, r) => s + (r.goals || 0), 0);
      const totalAssists = stats.reduce((s, r) => s + (r.assists || 0), 0);
      const totalMinutes = stats.reduce((s, r) => s + (r.minutesPlayed || 0), 0);
      const totalYellowCards = stats.reduce((s, r) => s + (r.yellowCards || 0), 0);
      const totalRedCards = stats.reduce((s, r) => s + (r.redCards || 0), 0);
      const totalAttendances = attendances.length;
      const presentCount = attendances.filter((a) => a.status === "present").length;

      // Calculate team max values for normalization
      let maxGoals = 1;
      let maxAssists = 1;
      let maxMinutes = 1;
      let maxAttendance = 1;

      for (const tp of teamPlayers) {
        const pStats = await db
          .select()
          .from(playerMatchStats)
          .where(eq(playerMatchStats.playerId, tp.id));
        const pAttendances = await db
          .select()
          .from(attendance)
          .where(eq(attendance.playerId, tp.id));

        const pGoals = pStats.reduce((s, r) => s + (r.goals || 0), 0);
        const pAssists = pStats.reduce((s, r) => s + (r.assists || 0), 0);
        const pMinutes = pStats.reduce((s, r) => s + (r.minutesPlayed || 0), 0);
        const pTotalAtt = pAttendances.length;
        const pPresent = pAttendances.filter((a) => a.status === "present").length;

        if (pGoals > maxGoals) maxGoals = pGoals;
        if (pAssists > maxAssists) maxAssists = pAssists;
        if (pMinutes > maxMinutes) maxMinutes = pMinutes;
        if (pTotalAtt > 0 && pPresent / pTotalAtt > maxAttendance) maxAttendance = pPresent / pTotalAtt;
      }

      // Normalize and calculate KPI
      const goalsNorm = maxGoals > 0 ? totalGoals / maxGoals : 0;
      const assistsNorm = maxAssists > 0 ? totalAssists / maxAssists : 0;
      const attendanceNorm = totalAttendances > 0 ? presentCount / totalAttendances / maxAttendance : 0;
      const minutesNorm = maxMinutes > 0 ? totalMinutes / maxMinutes : 0;
      // Discipline: fewer cards is better, invert
      const cardsTotal = totalYellowCards + totalRedCards * 3;
      const disciplineNorm = Math.max(0, 1 - cardsTotal / 10);

      // Weights
      const wGoals = 0.3;
      const wAssists = 0.2;
      const wAttendance = 0.2;
      const wMinutes = 0.2;
      const wDiscipline = 0.1;

      const kpi =
        wGoals * goalsNorm +
        wAssists * assistsNorm +
        wAttendance * attendanceNorm +
        wMinutes * minutesNorm +
        wDiscipline * disciplineNorm;

      return {
        radar: {
          goals: Math.round(goalsNorm * 100),
          assists: Math.round(assistsNorm * 100),
          attendance: Math.round(attendanceNorm * 100),
          minutes: Math.round(minutesNorm * 100),
          discipline: Math.round(disciplineNorm * 100),
        },
        kpi: Math.round(kpi * 100),
        raw: {
          totalMatches: stats.length,
          totalGoals,
          totalAssists,
          totalMinutes,
          totalYellowCards,
          totalRedCards,
          totalAttendances,
          presentCount,
        },
      };
    }),

  // Attendance dynamics for a team
  getAttendanceDynamics: publicQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const trainings = await db
        .select()
        .from(trainingSessions)
        .where(eq(trainingSessions.teamId, input.teamId));

      const result = [];
      for (const training of trainings) {
        const records = await db
          .select()
          .from(attendance)
          .where(eq(attendance.trainingId, training.id));

        const total = records.length;
        const present = records.filter((r) => r.status === "present").length;
        result.push({
          date: training.sessionDate,
          name: training.name,
          total,
          present,
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
        });
      }
      return result;
    }),

  // Match activity for a team
  getMatchActivity: publicQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const teamMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.teamId, input.teamId));

      const result = [];
      for (const match of teamMatches) {
        const stats = await db
          .select()
          .from(playerMatchStats)
          .where(eq(playerMatchStats.matchId, match.id));

        const totalGoals = stats.reduce((s, r) => s + (r.goals || 0), 0);
        const totalAssists = stats.reduce((s, r) => s + (r.assists || 0), 0);

        result.push({
          date: match.matchDate,
          opponent: match.opponent,
          scoreHome: match.scoreHome,
          scoreAway: match.scoreAway,
          isHome: match.isHome,
          goals: totalGoals,
          assists: totalAssists,
        });
      }
      return result;
    }),

  // Physical state dynamics
  getPhysicalDynamics: publicQuery
    .input(z.object({ playerId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(healthMetrics)
        .where(eq(healthMetrics.playerId, input.playerId))
        .orderBy(healthMetrics.recordedAt);
    }),

  // Team statistics summary
  getTeamStats: publicQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, input.teamId));

      const teamMatches = await db
        .select()
        .from(matches)
        .where(eq(matches.teamId, input.teamId));

      const trainings = await db
        .select()
        .from(trainingSessions)
        .where(eq(trainingSessions.teamId, input.teamId));

      const activeInjuries = [];
      for (const player of teamPlayers) {
        const playerInjuries = await db
          .select()
          .from(injuries)
          .where(eq(injuries.playerId, player.id));
        const active = playerInjuries.filter(
          (i) => i.status === "active" || i.status === "recovering"
        );
        activeInjuries.push(...active);
      }

      const wins = teamMatches.filter(
        (m) =>
          (m.isHome && (m.scoreHome || 0) > (m.scoreAway || 0)) ||
          (!m.isHome && (m.scoreAway || 0) > (m.scoreHome || 0))
      ).length;
      const draws = teamMatches.filter(
        (m) => (m.scoreHome || 0) === (m.scoreAway || 0)
      ).length;
      const losses = teamMatches.length - wins - draws;

      return {
        playerCount: teamPlayers.length,
        totalMatches: teamMatches.length,
        wins,
        draws,
        losses,
        totalTrainings: trainings.length,
        activeInjuries: activeInjuries.length,
      };
    }),

  // Detect anomalies
  getAnomalies: publicQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const anomalies = [];

      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, input.teamId));

      for (const player of teamPlayers) {
        // Check weight changes
        const healthData = await db
          .select()
          .from(healthMetrics)
          .where(eq(healthMetrics.playerId, player.id))
          .orderBy(healthMetrics.recordedAt);

        if (healthData.length >= 2) {
          const weights = healthData
            .map((h) => Number(h.weight))
            .filter((w) => w > 0);
          if (weights.length >= 2) {
            const mean = weights.reduce((s, w) => s + w, 0) / weights.length;
            const std = Math.sqrt(
              weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length
            );
            const lastWeight = weights[weights.length - 1];
            const zScore = std > 0 ? (lastWeight - mean) / std : 0;
            if (Math.abs(zScore) > 2) {
              anomalies.push({
                type: "weight_change",
                severity: Math.abs(zScore) > 3 ? "error" : "warning",
                playerId: player.id,
                playerName: player.name,
                message: `Резкое изменение веса: ${lastWeight}кг (Z-score: ${zScore.toFixed(2)})`,
              });
            }
          }
        }

        // Check heart rate
        const lastHealth = healthData[healthData.length - 1];
        if (lastHealth && lastHealth.restingHr && player.birthDate) {
          const age =
            new Date().getFullYear() -
            new Date(player.birthDate).getFullYear();
          const hrMax = 208 - 0.7 * age;
          if (lastHealth.restingHr > hrMax) {
            anomalies.push({
              type: "high_hr",
              severity: "error",
              playerId: player.id,
              playerName: player.name,
              message: `Превышение пульса: ${lastHealth.restingHr} уд/мин (HRmax: ${hrMax.toFixed(0)})`,
            });
          }
        }

        // Check attendance
        const attendances = await db
          .select()
          .from(attendance)
          .where(eq(attendance.playerId, player.id));
        const sorted = attendances.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        let consecutiveAbsences = 0;
        for (const att of sorted.slice(0, 5)) {
          if (att.status === "absent") consecutiveAbsences++;
          else break;
        }
        if (consecutiveAbsences >= 3) {
          anomalies.push({
            type: "absence",
            severity: "warning",
            playerId: player.id,
            playerName: player.name,
            message: `Длительное отсутствие: ${consecutiveAbsences} тренировок подряд`,
          });
        }
      }

      return anomalies;
    }),
});
