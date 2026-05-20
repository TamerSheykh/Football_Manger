import { relations } from "drizzle-orm";
import {
  users,
  teams,
  players,
  trainingSessions,
  attendance,
  matches,
  playerMatchStats,
  medicalRecords,
  injuries,
  healthMetrics,
  notifications,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  user: one(users, { fields: [teams.userId], references: [users.id] }),
  players: many(players),
  trainingSessions: many(trainingSessions),
  matches: many(matches),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
  attendance: many(attendance),
  matchStats: many(playerMatchStats),
  medicalRecords: many(medicalRecords),
  injuries: many(injuries),
  healthMetrics: many(healthMetrics),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one, many }) => ({
  team: one(teams, { fields: [trainingSessions.teamId], references: [teams.id] }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  training: one(trainingSessions, { fields: [attendance.trainingId], references: [trainingSessions.id] }),
  player: one(players, { fields: [attendance.playerId], references: [players.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  team: one(teams, { fields: [matches.teamId], references: [teams.id] }),
  playerStats: many(playerMatchStats),
}));

export const playerMatchStatsRelations = relations(playerMatchStats, ({ one }) => ({
  match: one(matches, { fields: [playerMatchStats.matchId], references: [matches.id] }),
  player: one(players, { fields: [playerMatchStats.playerId], references: [players.id] }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  player: one(players, { fields: [medicalRecords.playerId], references: [players.id] }),
}));

export const injuriesRelations = relations(injuries, ({ one }) => ({
  player: one(players, { fields: [injuries.playerId], references: [players.id] }),
}));

export const healthMetricsRelations = relations(healthMetrics, ({ one }) => ({
  player: one(players, { fields: [healthMetrics.playerId], references: [players.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
