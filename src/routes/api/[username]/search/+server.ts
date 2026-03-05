import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getValidToken, searchTracks } from '$lib/server/spotify';
import type { SpotifyTrack } from '$lib/types';

export const GET: RequestHandler = async ({ params, url, cookies }) => {
  const query = url.searchParams.get('q');
  if (!query || query.trim().length < 2) {
    return json([]);
  }

  const username = params.username!;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) throw error(404, 'User not found');

  if (cookies.get(`pc_${username}`) !== user.passcode) throw error(401, 'Invalid passcode');

  try {
    const accessToken = await getValidToken(user.id);
    const tracks = await searchTracks(accessToken, query.trim(), 10);

    const settings = user.shareSettings;

    const filtered: SpotifyTrack[] = tracks.filter((t) => {
      if (!settings.allowExplicit && t.explicit) return false;
      if (settings.yearFrom && t.releaseYear && t.releaseYear < settings.yearFrom) return false;
      if (settings.yearTo && t.releaseYear && t.releaseYear > settings.yearTo) return false;
      return true;
    });

    return json(filtered);
  } catch (err) {
    console.error('Search error:', err);
    throw error(502, 'Search failed');
  }
};
