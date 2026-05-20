import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  mysqlEnum,
  bigint,
  date,
  time,
  boolean,
} from "drizzle-orm/mysql-core";

// Users - custom auth 
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["coach", "medical"]).default("coach").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Teams
export const teams = mysqlTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  ageGroup: varchar("age_group", { length: 50 }),
  color: varchar("color", { length: 7 }).default("#96f7b9"),
  description: text("description"),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// Players
export const players = mysqlTable("players", {
  id: serial("id").primaryKey(),
  teamId: bigint("team_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  position: mysqlEnum("position", ["GK", "DEF", "MID", "FWD"]).notNull(),
  birthDate: date("birth_date"),
  height: decimal("height", { precision: 5, scale: 2 }),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  jerseyNumber: int("jersey_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

// Training Sessions
export const trainingSessions = mysqlTable("training_sessions", {
  id: serial("id").primaryKey(),
  teamId: bigint("team_id", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sessionDate: date("session_date").notNull(),
  sessionTime: time("session_time"),
  location: varchar("location", { length: 255 }),
  type: mysqlEnum("type", ["general", "tactical", "physical", "technical"]).default("general").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TrainingSession = typeof trainingSessions.$inferSelect;
export type InsertTrainingSession = typeof trainingSessions.$inferInsert;

// Attendance
export const attendance = mysqlTable("attendance", {
  id: serial("id").primaryKey(),
  trainingId: bigint("training_id", { mode: "number", unsigned: true }).notNull(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["present", "absent", "late"]).default("present").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = typeof attendance.$inferInsert;

// Matches
export const matches = mysqlTable("matches", {
  id: serial("id").primaryKey(),
  teamId: bigint("team_id", { mode: "number", unsigned: true }).notNull(),
  opponent: varchar("opponent", { length: 255 }).notNull(),
  matchDate: date("match_date").notNull(),
  scoreHome: int("score_home").default(0),
  scoreAway: int("score_away").default(0),
  isHome: boolean("is_home").default(true),
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["scheduled", "played", "cancelled"]).default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Match = typeof matches.$inferSelect;
export type InsertMatch = typeof matches.$inferInsert;

// Player Match Statistics
export const playerMatchStats = mysqlTable("player_match_stats", {
  id: serial("id").primaryKey(),
  matchId: bigint("match_id", { mode: "number", unsigned: true }).notNull(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  goals: int("goals").default(0),
  assists: int("assists").default(0),
  yellowCards: int("yellow_cards").default(0),
  redCards: int("red_cards").default(0),
  minutesPlayed: int("minutes_played").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PlayerMatchStat = typeof playerMatchStats.$inferSelect;
export type InsertPlayerMatchStat = typeof playerMatchStats.$inferInsert;

// Medical Records
export const medicalRecords = mysqlTable("medical_records", {
  id: serial("id").primaryKey(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  examinationDate: date("examination_date").notNull(),
  status: mysqlEnum("status", ["cleared", "limited", "not_cleared"]).default("cleared").notNull(),
  notes: text("notes"),
  certificateUrl: text("certificate_url"),
  certificateExpiry: date("certificate_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MedicalRecord = typeof medicalRecords.$inferSelect;
export type InsertMedicalRecord = typeof medicalRecords.$inferInsert;

// Injuries
export const injuries = mysqlTable("injuries", {
  id: serial("id").primaryKey(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  description: text("description"),
  dateOccurred: date("date_occurred").notNull(),
  recoveryDays: int("recovery_days"),
  status: mysqlEnum("status", ["active", "recovering", "healed"]).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Injury = typeof injuries.$inferSelect;
export type InsertInjury = typeof injuries.$inferInsert;

// Health Metrics
export const healthMetrics = mysqlTable("health_metrics", {
  id: serial("id").primaryKey(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }),
  restingHr: int("resting_hr"),
  cooperDistance: decimal("cooper_distance", { precision: 6, scale: 3 }),
  height: decimal("height", { precision: 5, scale: 2 }),
  bloodPressureSys: int("blood_pressure_sys"),
  bloodPressureDia: int("blood_pressure_dia"),
  recordedAt: date("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type HealthMetric = typeof healthMetrics.$inferSelect;
export type InsertHealthMetric = typeof healthMetrics.$inferInsert;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("user_id", { mode: "number", unsigned: true }).notNull(),
  type: mysqlEnum("type", ["warning", "error", "info"]).default("info").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
