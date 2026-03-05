import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { deleteSession } from '$lib/server/session';
import { generatePasscode } from '$lib/utils';
import type { ShareSettings } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) return { user: null };

  const [user] = await db.select().from(users).where(eq(users.id, locals.user.id)).limit(1);

  if (!user) return { user: null };

  return {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      passcode: user.passcode,
      shareSettings: user.shareSettings
    }
  };
};

export const actions: Actions = {
  logout: async ({ cookies, locals }) => {
    const sessionId = cookies.get('session');
    if (sessionId) {
      await deleteSession(sessionId);
      cookies.delete('session', { path: '/' });
    }
    throw redirect(302, '/');
  },

  regeneratePasscode: async ({ locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const newPasscode = generatePasscode();
    await db
      .update(users)
      .set({ passcode: newPasscode, updatedAt: new Date() })
      .where(eq(users.id, locals.user.id));

    return { passcode: newPasscode };
  },

  updateSettings: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Unauthorized' });

    const data = await request.formData();
    const rateLimitSongs = parseInt(data.get('rateLimitSongs') as string, 10);
    const rateLimitMinutes = parseInt(data.get('rateLimitMinutes') as string, 10);
    const allowExplicit = data.get('allowExplicit') === 'true';
    const yearFromRaw = data.get('yearFrom') as string;
    const yearToRaw = data.get('yearTo') as string;

    const settings: ShareSettings = {
      rateLimitSongs: isNaN(rateLimitSongs) ? 0 : Math.max(0, rateLimitSongs),
      rateLimitMinutes: isNaN(rateLimitMinutes) ? 5 : Math.max(1, rateLimitMinutes),
      allowExplicit,
      yearFrom: yearFromRaw ? parseInt(yearFromRaw, 10) : null,
      yearTo: yearToRaw ? parseInt(yearToRaw, 10) : null
    };

    await db
      .update(users)
      .set({ shareSettings: settings, updatedAt: new Date() })
      .where(eq(users.id, locals.user.id));

    return { success: true, settings };
  }
};
