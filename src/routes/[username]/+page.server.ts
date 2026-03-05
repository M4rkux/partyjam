import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, url, cookies }) => {
  const { username } = params;

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      passcode: users.passcode
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) throw error(404, `@${username} not found`);

  // Check passcode from URL param first, then cookie
  const urlPasscode = url.searchParams.get('passcode');
  const cookieName = `pc_${username}`;
  const cookiePasscode = cookies.get(cookieName);

  const candidate = urlPasscode ?? cookiePasscode;

  if (!candidate || candidate !== user.passcode) {
    // Invalidate stale cookie
    if (cookiePasscode && cookiePasscode !== user.passcode) {
      cookies.delete(cookieName, { path: '/' });
    }
    return {
      requiresPasscode: true as const,
      username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    };
  }

  // Valid passcode — set/refresh cookie and strip query param if needed
  cookies.set(cookieName, user.passcode, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60
  });

  if (urlPasscode) {
    throw redirect(302, `/${username}`);
  }

  // Ensure visitor ID cookie exists
  let visitorId = cookies.get('visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    cookies.set('visitor_id', visitorId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60
    });
  }

  return {
    requiresPasscode: false as const,
    username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    userId: user.id
  };
};

export const actions: Actions = {
  validatePasscode: async ({ request, params, cookies }) => {
    const { username } = params;
    const data = await request.formData();

    // Collect 6 digits
    const digits = [1, 2, 3, 4, 5, 6].map((i) => (data.get(`d${i}`) as string) ?? '');
    const passcode = digits.join('');

    if (!/^\d{6}$/.test(passcode)) {
      return fail(400, { error: 'Enter a valid 6-digit passcode.' });
    }

    const [user] = await db
      .select({ passcode: users.passcode })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user || passcode !== user.passcode) {
      return fail(400, { error: 'Incorrect passcode. Try again.' });
    }

    cookies.set(`pc_${username}`, passcode, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60
    });

    // Ensure visitor ID
    if (!cookies.get('visitor_id')) {
      cookies.set('visitor_id', crypto.randomUUID(), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60
      });
    }

    throw redirect(302, `/${username}`);
  }
};
