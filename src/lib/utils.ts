export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function generatePasscode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function buildShareUrl(origin: string, username: string, passcode: string): string {
  return `${origin}/${username}?passcode=${passcode}`;
}

// Safely parse an integer, returning null on failure
export function safeParseInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}
