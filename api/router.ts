import { authRouter } from "./auth-router";
import { customAuthRouter } from "./custom-auth-router";
import { teamRouter } from "./team-router";
import { playerRouter } from "./player-router";
import { trainingRouter } from "./training-router";
import { matchRouter } from "./match-router";
import { medicalRouter } from "./medical-router";
import { analyticsRouter } from "./analytics-router";
import { notificationRouter } from "./notification-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  customAuth: customAuthRouter,
  team: teamRouter,
  player: playerRouter,
  training: trainingRouter,
  match: matchRouter,
  medical: medicalRouter,
  analytics: analyticsRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
