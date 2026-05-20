import { eq } from "drizzle-orm";
import { getDb } from "./connection";
import { users } from "@db/schema";

export async function findUserByUnionId(unionId: string) {
  const db = getDb();
  // Since we changed schema, unionId maps to email for compatibility
  const found = await db.select().from(users).where(eq(users.email, unionId)).limit(1);
  return found[0] ?? null;
}

export async function upsertUser(data: {
  unionId: string;
  name: string;
  avatar?: string;
  lastSignInAt?: Date;
}) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.email, data.unionId)).limit(1);
  if (existing.length > 0) {
    await db.update(users).set({
      name: data.name || existing[0].name,
      updatedAt: data.lastSignInAt || new Date(),
    }).where(eq(users.id, existing[0].id));
    return existing[0];
  }
  // Create a new user with the Kimi OAuth data
  const result = await db.insert(users).values({
    email: data.unionId,
    name: data.name,
    passwordHash: "oauth-" + Math.random().toString(36).slice(2),
    role: "coach",
  });
  return { id: Number(result[0].insertId), email: data.unionId, name: data.name, role: "coach" };
}
