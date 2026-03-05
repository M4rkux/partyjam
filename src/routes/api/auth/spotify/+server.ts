import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getAuthUrl } from '$lib/server/spotify';

export const GET: RequestHandler = async ({ cookies }) => {
  const state = crypto.randomUUID();

  // Store state in a short-lived cookie for CSRF protection
  cookies.set('spotify_oauth_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  });

  throw redirect(302, getAuthUrl(state));
};
