import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, queueAdditions } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// DELETE: soft-delete a queue addition (visitor can only remove their own)
export const DELETE: RequestHandler = async ({ params, cookies }) => {
  const visitorId = cookies.get('visitor_id');
  if (!visitorId) throw error(403, 'Missing visitor session');

  const username = params.username!;
  const id = params.id!;

  const [user] = await db
    .select({ id: users.id, passcode: users.passcode })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) throw error(404, 'User not found');

  if (cookies.get(`pc_${username}`) !== user.passcode) throw error(401, 'Invalid passcode');

  const [addition] = await db
    .select()
    .from(queueAdditions)
    .where(and(eq(queueAdditions.id, id), eq(queueAdditions.ownerId, user.id)))
    .limit(1);

  if (!addition) throw error(404, 'Addition not found');
  if (addition.visitorId !== visitorId) throw error(403, 'Not your addition');

  await db
    .update(queueAdditions)
    .set({ removedAt: new Date() })
    .where(eq(queueAdditions.id, id));

  return json({ success: true });
};
