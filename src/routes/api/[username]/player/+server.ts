import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getValidToken, getPlayerState } from '$lib/server/spotify';

export const GET: RequestHandler = async ({ params }) => {
  const username = params.username!;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) throw error(404, 'User not found');

  try {
    const accessToken = await getValidToken(user.id);
    const playerState = await getPlayerState(accessToken);
    return json(playerState);
  } catch (err) {
    console.error('Player fetch error:', err);
    return json({ isPlaying: false, track: null, progressMs: 0, queue: [] });
  }
};
