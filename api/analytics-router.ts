import { z } from "zod";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
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
  teams as teamsTable,
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

  // Player match activity (per-match goals + assists)
  getPlayerMatchActivity: publicQuery
    .input(z.object({ playerId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const stats = await db
        .select()
        .from(playerMatchStats)
        .where(eq(playerMatchStats.playerId, input.playerId));
      const result = [];
      for (const stat of stats) {
        const match = await db
          .select()
          .from(matches)
          .where(eq(matches.id, stat.matchId))
          .limit(1);
        if (match[0]) {
          result.push({
            date: match[0].matchDate,
            opponent: match[0].opponent,
            goals: stat.goals ?? 0,
            assists: stat.assists ?? 0,
          });
        }
      }
      return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

      // This week's trainings (Monday–Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const trainings = await db
        .select()
        .from(trainingSessions)
        .where(
          and(
            eq(trainingSessions.teamId, input.teamId),
            gte(trainingSessions.sessionDate, weekStart),
            lte(trainingSessions.sessionDate, weekEnd)
          )
        );

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

  getPlayerRiskScores: publicQuery
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      // Load team info for age/category context
      const teamInfo = await db
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.id, input.teamId))
        .limit(1);

      const teamCategory = teamInfo[0]?.category || "main";
      const teamAgeGroup = teamInfo[0]?.ageGroup || "";

      // Determine age-based scaling factor from team category
      // children → 0.4, youth → 0.7, main → 1.0
      const categoryScale =
        teamCategory === "children" ? 0.4 :
        teamCategory === "youth" ? 0.7 : 1.0;

      const teamPlayers = await db
        .select()
        .from(players)
        .where(eq(players.teamId, input.teamId));

      const results: Array<{
        playerId: number;
        playerName: string;
        position: string;
        age: number;
        score: number;
        level: "low" | "medium" | "elevated" | "high";
        factors: {
          injury: number;
          weightChange: number;
          heartRate: number;
          attendance: number;
          matchLoad: number;
        };
      }> = [];

      for (const player of teamPlayers) {
        let score = 0;

        // Calculate player age
        const playerAge = player.birthDate
          ? new Date().getFullYear() - new Date(player.birthDate).getFullYear()
          : 0;

        // Combine category scale with individual age for finer granularity
        // Children (<14) use 0.4, youth (14-17) use 0.7, adults use 1.0
        const ageScale =
          playerAge < 14 ? 0.4 :
          playerAge < 18 ? 0.7 :
          Math.max(categoryScale, 0.8);

        // Scaled thresholds for attendance and match load
        const absencePoints = Math.round(4 * ageScale);
        const latePoints = Math.round(2 * ageScale);
        const matchLoadHigh = Math.round(270 * ageScale);
        const matchLoadMedium = Math.round(200 * ageScale);
        const matchLoadLow = Math.round(100 * ageScale);

        // --- Factor 1: Injury status (0-30) ---
        const playerInjuries = await db
          .select()
          .from(injuries)
          .where(eq(injuries.playerId, player.id));

        const activeInjury = playerInjuries.find((i) => i.status === "active");
        const recoveringInjury = playerInjuries.find((i) => i.status === "recovering");
        let injuryPoints = 0;
        if (activeInjury) injuryPoints = 30;
        else if (recoveringInjury) injuryPoints = 15;
        score += injuryPoints;

        // --- Factor 2: Weight Z-score (0-20) ---
        // Statistical — uses player's own history, no age adjustment needed
        const healthData = await db
          .select()
          .from(healthMetrics)
          .where(eq(healthMetrics.playerId, player.id))
          .orderBy(healthMetrics.recordedAt);

        const weights = healthData
          .map((h) => Number(h.weight))
          .filter((w) => w > 0);

        let weightPoints = 0;
        if (weights.length >= 2) {
          const mean = weights.reduce((s, w) => s + w, 0) / weights.length;
          const std = Math.sqrt(
            weights.reduce((s, w) => s + (w - mean) ** 2, 0) / weights.length
          );
          const lastWeight = weights[weights.length - 1];
          const zScore = std > 0 ? (lastWeight - mean) / std : 0;
          if (Math.abs(zScore) > 3) weightPoints = 20;
          else if (Math.abs(zScore) > 2) weightPoints = 10;
        }
        score += weightPoints;

        // --- Factor 3: Resting heart rate (0-15) ---
        // HRmax = 208 - 0.7*age already accounts for age
        let hrPoints = 0;
        const lastHealth = healthData[healthData.length - 1];
        if (lastHealth?.restingHr && player.birthDate) {
          const hrMax = 208 - 0.7 * playerAge;
          if (lastHealth.restingHr > hrMax) hrPoints = 15;
          else if (lastHealth.restingHr > hrMax * 0.85) hrPoints = 7;
        }
        score += hrPoints;

        // --- Factor 4: Training attendance (0-20) ---
        // Thresholds scaled by age
        const lastTrainings = await db
          .select()
          .from(trainingSessions)
          .where(eq(trainingSessions.teamId, input.teamId))
          .orderBy(desc(trainingSessions.sessionDate))
          .limit(5);

        let attendancePoints = 0;
        if (lastTrainings.length > 0) {
          const trainingIds = lastTrainings.map((t) => t.id);
          const playerAttendance = await db
            .select()
            .from(attendance)
            .where(
              and(
                eq(attendance.playerId, player.id),
                inArray(attendance.trainingId, trainingIds)
              )
            );

          for (const att of playerAttendance) {
            if (att.status === "absent") attendancePoints += absencePoints;
            else if (att.status === "late") attendancePoints += latePoints;
          }
        }
        score += attendancePoints;

        // --- Factor 5: Match load (0-15) ---
        // Thresholds scaled by age
        const lastMatches = await db
          .select()
          .from(matches)
          .where(
            and(
              eq(matches.teamId, input.teamId),
              eq(matches.status, "played")
            )
          )
          .orderBy(desc(matches.matchDate))
          .limit(3);

        let matchLoadPoints = 0;
        if (lastMatches.length > 0) {
          const matchIds = lastMatches.map((m) => m.id);
          const playerStats = await db
            .select()
            .from(playerMatchStats)
            .where(
              and(
                eq(playerMatchStats.playerId, player.id),
                inArray(playerMatchStats.matchId, matchIds)
              )
            );

          const totalMinutes = playerStats.reduce(
            (s, ps) => s + (ps.minutesPlayed || 0),
            0
          );
          if (totalMinutes > matchLoadHigh) matchLoadPoints = 15;
          else if (totalMinutes > matchLoadMedium) matchLoadPoints = 10;
          else if (totalMinutes > matchLoadLow) matchLoadPoints = 5;
        }
        score += matchLoadPoints;

        // Determine risk level
        let level: "low" | "medium" | "elevated" | "high";
        if (score > 60) level = "high";
        else if (score > 40) level = "elevated";
        else if (score > 20) level = "medium";
        else level = "low";

        results.push({
          playerId: player.id,
          playerName: player.name,
          position: player.position,
          age: playerAge,
          score,
          level,
          factors: {
            injury: injuryPoints,
            weightChange: weightPoints,
            heartRate: hrPoints,
            attendance: attendancePoints,
            matchLoad: matchLoadPoints,
          },
        });
      }

      // Sort by score descending (highest risk first)
      results.sort((a, b) => b.score - a.score);
      return results;
    }),
});
