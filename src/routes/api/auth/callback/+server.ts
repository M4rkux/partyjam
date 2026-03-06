import type { RequestHandler } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { exchangeCode, getSpotifyProfile } from '$lib/server/spotify';
import { createSession } from '$lib/server/session';
import { generatePasscode } from '$lib/utils';
import { defaultShareSettings } from '$lib/types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const spotifyError = url.searchParams.get('error');
  const storedState = cookies.get('spotify_oauth_state');

  cookies.delete('spotify_oauth_state', { path: '/' });

  if (spotifyError) {
    throw error(400, spotifyError === 'access_denied' ? 'Login cancelled.' : `Spotify error: ${spotifyError}`);
  }

  if (!code || !state || state !== storedState) {
    throw error(400, 'Invalid OAuth state. Please try logging in again.');
  }

  let accessToken: string, refreshToken: string, expiresIn: number;
  try {
    ({ accessToken, refreshToken, expiresIn } = await exchangeCode(code));
  } catch (err) {
    console.error('Token exchange failed:', err);
    throw error(502, 'Failed to complete Spotify login. Please try again.');
  }

  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  let profile: Awaited<ReturnType<typeof getSpotifyProfile>>;
  try {
    profile = await getSpotifyProfile(accessToken);
  } catch (err) {
    console.error('Spotify profile fetch failed:', err);
    throw error(502, 'Failed to fetch Spotify profile. Please try again.');
  }

  const spotifyId = profile.id;
  const username = profile.id; // Spotify ID is the username (unique, URL-safe)
  const displayName = profile.display_name ?? null;
  const avatarUrl = profile.images?.[0]?.url ?? null;

  // Upsert user
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.spotifyId, spotifyId))
    .limit(1);

  let userId: string;

  if (existing.length) {
    userId = existing[0].id;
    await db
      .update(users)
      .set({ accessToken, refreshToken, tokenExpiresAt, displayName, avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, userId));
  } else {
    const [inserted] = await db
      .insert(users)
      .values({
        spotifyId,
        username,
        displayName,
        avatarUrl,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        passcode: generatePasscode(),
        shareSettings: defaultShareSettings
      })
      .returning({ id: users.id });
    userId = inserted.id;
  }

  const sessionId = await createSession(userId);

  cookies.set('session', sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  });

  throw redirect(302, '/');
};
