import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, queueAdditions } from '$lib/server/db/schema';
import { eq, and, isNull, gte, count } from 'drizzle-orm';
import { getValidToken, addTrackToQueue } from '$lib/server/spotify';
import type { QueueAddition } from '$lib/types';

// GET: list of additions for this owner (for the share page feed)
export const GET: RequestHandler = async ({ params, cookies }) => {
  const username = params.username!;

  const [user] = await db
    .select({ id: users.id, passcode: users.passcode })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) throw error(404, 'User not found');

  if (cookies.get(`pc_${username}`) !== user.passcode) throw error(401, 'Invalid passcode');

  const visitorId = cookies.get('visitor_id') ?? '';

  const additions = await db
    .select()
    .from(queueAdditions)
    .where(and(eq(queueAdditions.ownerId, user.id), isNull(queueAdditions.removedAt)))
    .orderBy(queueAdditions.addedAt);

  const result: QueueAddition[] = additions.map((a) => ({
    id: a.id,
    trackId: a.trackId,
    trackName: a.trackName,
    trackArtist: a.trackArtist,
    trackUri: a.trackUri,
    trackImageUrl: a.trackImageUrl,
    addedAt: a.addedAt.toISOString(),
    isOwn: a.visitorId === visitorId
  }));

  return json(result);
};

// POST: add a track to the queue
export const POST: RequestHandler = async ({ params, request, cookies }) => {
  const username = params.username!;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) throw error(404, 'User not found');

  if (cookies.get(`pc_${username}`) !== user.passcode) throw error(401, 'Invalid passcode');

  const visitorId = cookies.get('visitor_id');
  if (!visitorId) throw error(403, 'Missing visitor session');

  // Rate limit check
  const settings = user.shareSettings;
  if (settings.rateLimitSongs > 0) {
    const windowStart = new Date(Date.now() - settings.rateLimitMinutes * 60 * 1000);
    const [{ value: recentCount }] = await db
      .select({ value: count() })
      .from(queueAdditions)
      .where(
        and(
          eq(queueAdditions.ownerId, user.id),
          eq(queueAdditions.visitorId, visitorId),
          isNull(queueAdditions.removedAt),
          gte(queueAdditions.addedAt, windowStart)
        )
      );

    if (recentCount >= settings.rateLimitSongs) {
      throw error(
        429,
        `You can only add ${settings.rateLimitSongs} song(s) every ${settings.rateLimitMinutes} minute(s).`
      );
    }
  }

  const body = await request.json();
  const { trackId, trackName, trackArtist, trackUri, trackImageUrl, explicit, releaseYear } = body;

  if (!trackUri || !trackId) throw error(400, 'Missing track data');

  // Content filters
  if (!settings.allowExplicit && explicit) {
    throw error(400, 'Explicit tracks are not allowed on this queue.');
  }
  if (settings.yearFrom && releaseYear && releaseYear < settings.yearFrom) {
    throw error(400, `Only tracks from ${settings.yearFrom} or later are allowed.`);
  }
  if (settings.yearTo && releaseYear && releaseYear > settings.yearTo) {
    throw error(400, `Only tracks up to ${settings.yearTo} are allowed.`);
  }

  // Add to Spotify queue
  try {
    const accessToken = await getValidToken(user.id);
    await addTrackToQueue(accessToken, trackUri);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404')) {
      throw error(503, 'No active Spotify device. The host needs to be playing music.');
    }
    throw error(502, 'Failed to add track to Spotify queue.');
  }

  // Store in our DB
  const [addition] = await db
    .insert(queueAdditions)
    .values({
      ownerId: user.id,
      visitorId,
      trackId,
      trackName,
      trackArtist,
      trackUri,
      trackImageUrl: trackImageUrl ?? null
    })
    .returning();

  const result: QueueAddition = {
    id: addition.id,
    trackId: addition.trackId,
    trackName: addition.trackName,
    trackArtist: addition.trackArtist,
    trackUri: addition.trackUri,
    trackImageUrl: addition.trackImageUrl,
    addedAt: addition.addedAt.toISOString(),
    isOwn: true
  };

  return json(result, { status: 201 });
};
