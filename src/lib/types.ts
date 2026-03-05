export interface ShareSettings {
  rateLimitSongs: number;    // max songs per time window; 0 = unlimited
  rateLimitMinutes: number;  // time window in minutes
  allowExplicit: boolean;
  yearFrom: number | null;
  yearTo: number | null;
}

export const defaultShareSettings: ShareSettings = {
  rateLimitSongs: 0,
  rateLimitMinutes: 5,
  allowExplicit: true,
  yearFrom: null,
  yearTo: null
};

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  imageUrl: string | null;
  uri: string;
  explicit: boolean;
  releaseYear: number | null;
  durationMs: number;
}

export interface PlayerState {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  progressMs: number;
  queue: SpotifyTrack[];
}

export interface QueueAddition {
  id: string;
  trackId: string;
  trackName: string;
  trackArtist: string;
  trackUri: string;
  trackImageUrl: string | null;
  addedAt: string;
  isOwn: boolean;
}
