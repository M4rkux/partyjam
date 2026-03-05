import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/session';

export const POST: RequestHandler = async ({ cookies }) => {
  const sessionId = cookies.get('session');
  if (sessionId) {
    await deleteSession(sessionId);
    cookies.delete('session', { path: '/' });
  }
  throw redirect(302, '/');
};
