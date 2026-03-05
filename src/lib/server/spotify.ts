import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import type { SpotifyTrack, PlayerState } from "$lib/types";
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI } from "$env/static/private";

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";

export const SPOTIFY_SCOPES = ["user-read-private", "user-read-email", "user-read-currently-playing", "user-read-playback-state", "user-modify-playback-state"].join(" ");

// ── OAuth helpers ──────────────────────────────────────────────────────────────

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "false",
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params}`;
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

// ── Token management ───────────────────────────────────────────────────────────

/** Returns a valid access token for the user, refreshing if needed. */
export async function getValidToken(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  // Refresh 60 seconds before expiry
  if (user.tokenExpiresAt.getTime() - 60_000 > Date.now()) {
    return user.accessToken;
  }

  const { accessToken, expiresIn } = await refreshAccessToken(user.refreshToken);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  await db.update(users).set({ accessToken, tokenExpiresAt, updatedAt: new Date() }).where(eq(users.id, userId));

  return accessToken;
}

// ── API helpers ────────────────────────────────────────────────────────────────

async function spotifyFetch(path: string, accessToken: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${SPOTIFY_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// ── User profile ───────────────────────────────────────────────────────────────

export async function getSpotifyProfile(accessToken: string): Promise<{ id: string; display_name: string | null; images: { url: string }[] }> {
  const res = await spotifyFetch("/me", accessToken);
  if (!res.ok) throw new Error("Failed to fetch Spotify profile");
  return res.json();
}

// ── Player ─────────────────────────────────────────────────────────────────────

function mapTrack(item: Record<string, unknown>): SpotifyTrack {
  const artists = (item.artists as Array<{ name: string }>) ?? [];
  const album = item.album as Record<string, unknown>;
  const images = (album?.images as Array<{ url: string }>) ?? [];
  const releaseDate = (album?.release_date as string) ?? null;

  return {
    id: item.id as string,
    name: item.name as string,
    artist: artists.map((a) => a.name).join(", "),
    album: album?.name as string,
    imageUrl: images[0]?.url ?? null,
    uri: item.uri as string,
    explicit: (item.explicit as boolean) ?? false,
    releaseYear: releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : null,
    durationMs: (item.duration_ms as number) ?? 0,
  };
}

export async function getPlayerState(accessToken: string): Promise<PlayerState> {
  const res = await spotifyFetch("/me/player/queue", accessToken);

  if (res.status === 204 || res.status === 202) {
    return { isPlaying: false, track: null, progressMs: 0, queue: [] };
  }

  if (!res.ok) {
    return { isPlaying: false, track: null, progressMs: 0, queue: [] };
  }

  const data = await res.json();
  const currentlyPlaying = data.currently_playing as Record<string, unknown> | null;
  const queue = (data.queue as Array<Record<string, unknown>>) ?? [];

  // Also fetch progress from currently-playing endpoint
  let progressMs = 0;
  let isPlaying = false;

  const cpRes = await spotifyFetch("/me/player/currently-playing", accessToken);
  if (cpRes.ok && cpRes.status !== 204) {
    const cpData = await cpRes.json();
    progressMs = (cpData.progress_ms as number) ?? 0;
    isPlaying = (cpData.is_playing as boolean) ?? false;
  }

  return {
    isPlaying,
    track: currentlyPlaying ? mapTrack(currentlyPlaying) : null,
    progressMs,
    queue: queue.slice(0, 15).map(mapTrack),
  };
}

export async function addTrackToQueue(accessToken: string, trackUri: string): Promise<void> {
  const res = await spotifyFetch(`/me/player/queue?uri=${encodeURIComponent(trackUri)}`, accessToken, { method: "POST" });

  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to add track to queue (${res.status}): ${text}`);
  }
}

// ── Search ─────────────────────────────────────────────────────────────────────

export async function searchTracks(accessToken: string, query: string, limit = 10): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
    market: "from_token",
  });

  const res = await spotifyFetch(`/search?${params}`, accessToken);
  if (!res.ok) throw new Error("Search failed");

  const data = await res.json();
  const items = (data.tracks?.items ?? []) as Array<Record<string, unknown>>;
  return items.map(mapTrack);
}
