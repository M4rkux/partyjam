import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get('session');

  if (sessionId) {
    const session = await getSession(sessionId);
    event.locals.user = session?.user ?? null;
  } else {
    event.locals.user = null;
  }

  return resolve(event);
};
