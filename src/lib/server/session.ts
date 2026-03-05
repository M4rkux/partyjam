import { db } from './db';
import { sessions, users } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

export interface SessionUser {
  id: string;
  spotifyId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({ id: sessionId, userId, expiresAt });

  return sessionId;
}

export async function getSession(sessionId: string): Promise<{ user: SessionUser } | null> {
  const result = await db
    .select({
      userId: users.id,
      spotifyId: users.spotifyId,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      expiresAt: sessions.expiresAt
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!result.length) return null;

  const row = result[0];
  return {
    user: {
      id: row.userId,
      spotifyId: row.spotifyId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl
    }
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
