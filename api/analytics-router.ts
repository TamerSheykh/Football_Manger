import { z } from "zod";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
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
      const matchesPlayed = stats.length;

      // Per-90 rates
      const per90 = (val: number) => totalMinutes > 0 ? (val / totalMinutes) * 90 : 0;
      const goalsPer90 = per90(totalGoals);
      const assistsPer90 = per90(totalAssists);
      const cardsPer90 = per90(totalYellowCards + totalRedCards * 3);
      const minutesPerMatch = matchesPlayed > 0 ? totalMinutes / matchesPlayed : 0;

      // Calculate team max values for normalization (per-90 for performance metrics)
      let maxGoalsPer90 = 0.01;
      let maxAssistsPer90 = 0.01;
      let maxMinutesPerMatch = 0.01;
      let maxAttendance = 0.01;
      let minCardsPer90 = Infinity; // lower is better, track min for inversion

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
        const pYellow = pStats.reduce((s, r) => s + (r.yellowCards || 0), 0);
        const pRed = pStats.reduce((s, r) => s + (r.redCards || 0), 0);
        const pMatches = pStats.length;
        const pTotalAtt = pAttendances.length;
        const pPresent = pAttendances.filter((a) => a.status === "present").length;

        const pPer90 = (v: number) => pMinutes > 0 ? (v / pMinutes) * 90 : 0;
        const pGoalsPer90 = pPer90(pGoals);
        const pAssistsPer90 = pPer90(pAssists);
        const pCardsPer90 = pPer90(pYellow + pRed * 3);
        const pMinPerMatch = pMatches > 0 ? pMinutes / pMatches : 0;

        if (pGoalsPer90 > maxGoalsPer90) maxGoalsPer90 = pGoalsPer90;
        if (pAssistsPer90 > maxAssistsPer90) maxAssistsPer90 = pAssistsPer90;
        if (pMinPerMatch > maxMinutesPerMatch) maxMinutesPerMatch = pMinPerMatch;
        if (pTotalAtt > 0 && pPresent / pTotalAtt > maxAttendance) maxAttendance = pPresent / pTotalAtt;
        if (pCardsPer90 < minCardsPer90) minCardsPer90 = pCardsPer90;
      }

      // Normalize (0-1), discipline inverted
      const goalsNorm = goalsPer90 / maxGoalsPer90;
      const assistsNorm = assistsPer90 / maxAssistsPer90;
      const attendanceNorm = totalAttendances > 0 ? (presentCount / totalAttendances) / maxAttendance : 0;
      const minutesNorm = minutesPerMatch / maxMinutesPerMatch;
      const disciplineNorm = minCardsPer90 === Infinity ? 1 : Math.max(0, 1 - (cardsPer90 - minCardsPer90) / (cardsPer90 + minCardsPer90 + 0.01));

      // Position-dependent weights
      const position = player[0].position;
      const weights = {
        GK:  { goals: 0, assists: 0, attendance: 0.35, minutes: 0.35, discipline: 0.30 },
        DEF: { goals: 0.10, assists: 0.10, attendance: 0.25, minutes: 0.25, discipline: 0.30 },
        MID: { goals: 0.25, assists: 0.20, attendance: 0.20, minutes: 0.20, discipline: 0.15 },
        FWD: { goals: 0.40, assists: 0.20, attendance: 0.15, minutes: 0.15, discipline: 0.10 },
      };
      const w = weights[position as keyof typeof weights] || weights.MID;

      const kpi =
        w.goals * goalsNorm +
        w.assists * assistsNorm +
        w.attendance * attendanceNorm +
        w.minutes * minutesNorm +
        w.discipline * disciplineNorm;

      return {
        position,
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
          bloodPressure: number;
        };
      }> = [];

      for (const player of teamPlayers) {
        let score = 0;

        // Calculate player age
        const playerAge = player.birthDate
          ? new Date().getFullYear() - new Date(player.birthDate).getFullYear()
          : 0;

        // Combine category scale with individual age for finer granularity
        const ageScale =
          playerAge < 14 ? 0.4 :
          playerAge < 18 ? 0.7 :
          Math.max(categoryScale, 0.8);

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

        // --- Factor 4: Blood pressure (0-10) ---
        let bpPoints = 0;
        if (lastHealth?.bloodPressureSys || lastHealth?.bloodPressureDia) {
          const sys = lastHealth.bloodPressureSys || 0;
          const dia = lastHealth.bloodPressureDia || 0;
          if (sys > 160 || dia > 100) bpPoints = 10;
          else if (sys > 140 || dia > 90) bpPoints = 5;
          else if (sys > 130 || dia > 80) bpPoints = 2;
        }
        score += bpPoints;

        // Determine risk level
        let level: "low" | "medium" | "elevated" | "high";
        if (score > 45) level = "high";
        else if (score > 30) level = "elevated";
        else if (score > 15) level = "medium";
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
            bloodPressure: bpPoints,
          },
        });
      }

      // Sort by score descending (highest risk first)
      results.sort((a, b) => b.score - a.score);
      return results;
    }),
});
