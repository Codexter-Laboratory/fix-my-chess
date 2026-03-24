import type {
  ChessComArchiveResponse,
  ChessComGame,
  ApiError,
} from '../../shared/types';

const BASE_URL = 'https://api.chess.com/pub';
const REQUEST_HEADERS: HeadersInit = {
  Accept: 'application/json',
};

const RATE_LIMIT_STATUS = 429;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

// ---------------------------------------------------------------------------
// Low-level fetcher with retry / rate-limit handling
// ---------------------------------------------------------------------------

async function fetchWithRetry(url: string): Promise<Response> {
  let attempt = 0;
  let backoff = INITIAL_BACKOFF_MS;

  while (attempt < MAX_RETRIES) {
    const response = await fetch(url, { headers: REQUEST_HEADERS });

    if (response.ok) {
      return response;
    }

    if (response.status === RATE_LIMIT_STATUS) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : backoff;
      await delay(waitMs);
      backoff *= 2;
      attempt++;
      continue;
    }

    throw createApiError(response.status, await safeBodyText(response));
  }

  throw createApiError(RATE_LIMIT_STATUS, 'Rate limited after max retries');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchMonthlyGames(
  username: string,
  year?: number,
  month?: number,
): Promise<readonly ChessComGame[]> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const mm = String(m).padStart(2, '0');

  const url = `${BASE_URL}/player/${encodeURIComponent(username.toLowerCase())}/games/${y}/${mm}`;
  const response = await fetchWithRetry(url);
  const data: ChessComArchiveResponse = await response.json();

  return data.games;
}

/**
 * Fetches games for the last N months by building the archive URLs directly.
 * Fetches each month in parallel (respecting rate limits via retry logic).
 * Returns a flat array of all games sorted by end_time descending (newest first).
 */
export async function fetchRecentGames(
  username: string,
  months = 3,
  onProgress?: (fetched: number, total: number) => void,
): Promise<readonly ChessComGame[]> {
  const archiveUrls = buildRecentArchiveUrls(username, months);

  const allGames: ChessComGame[] = [];
  let fetched = 0;

  const results = await Promise.allSettled(
    archiveUrls.map(async (url) => {
      const response = await fetchWithRetry(url);
      const data: ChessComArchiveResponse = await response.json();
      fetched++;
      onProgress?.(fetched, archiveUrls.length);
      return data.games;
    }),
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allGames.push(...result.value);
    }
  }

  allGames.sort((a, b) => (b.end_time ?? 0) - (a.end_time ?? 0));

  return allGames;
}

export async function fetchPlayerProfile(
  username: string,
): Promise<{ username: string; avatar?: string; joined: number }> {
  const url = `${BASE_URL}/player/${encodeURIComponent(username.toLowerCase())}`;
  const response = await fetchWithRetry(url);
  return response.json();
}

/**
 * Lightweight check: does this player have any game archives in the last N months?
 * Uses the /games/archives endpoint which returns only URLs (no PGN data).
 */
export async function hasRecentGames(
  username: string,
  months = 3,
): Promise<boolean> {
  const url = `${BASE_URL}/player/${encodeURIComponent(username.toLowerCase())}/games/archives`;
  const response = await fetchWithRetry(url);
  const data: { archives: string[] } = await response.json();

  if (!data.archives || data.archives.length === 0) return false;

  const now = new Date();
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  return data.archives.some((archiveUrl) => {
    const match = archiveUrl.match(/\/games\/(\d{4})\/(\d{2})$/);
    if (!match) return false;
    const archiveDate = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return archiveDate >= cutoff;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRecentArchiveUrls(username: string, months: number): string[] {
  const urls: string[] = [];
  const now = new Date();
  const encodedUser = encodeURIComponent(username.toLowerCase());

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    urls.push(`${BASE_URL}/player/${encodedUser}/games/${y}/${mm}`);
  }

  return urls;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createApiError(status: number, message: string): ApiError {
  return {
    status,
    message,
    retryAfterMs: status === RATE_LIMIT_STATUS ? INITIAL_BACKOFF_MS : null,
  };
}

async function safeBodyText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return `HTTP ${response.status}`;
  }
}
