import type {
  ChessComGame,
  GameOutcome,
  GameResult,
  OpeningStats,
  PlayerColor,
} from '../../../shared/types';

// ---------------------------------------------------------------------------
// PGN header parsing (pure, no chess.js needed — headers are plain text)
// ---------------------------------------------------------------------------

const HEADER_REGEX = /\[(\w+)\s+"([^"]*)"\]/g;

interface PgnHeaders {
  eco: string;
  opening: string;
  white: string;
  black: string;
  result: string;
  link: string;
  whiteElo: string;
  blackElo: string;
}

function extractHeaders(pgn: string): PgnHeaders {
  const headers: Record<string, string> = {};
  let match: RegExpExecArray | null;

  HEADER_REGEX.lastIndex = 0;
  while ((match = HEADER_REGEX.exec(pgn)) !== null) {
    headers[match[1]] = match[2];
  }

  return {
    eco: headers['ECO'] ?? '',
    opening: headers['ECOUrl']?.split('/').pop()?.replace(/-/g, ' ') ?? headers['Opening'] ?? headers['ECO'] ?? 'Unknown',
    white: headers['White'] ?? '',
    black: headers['Black'] ?? '',
    result: headers['Result'] ?? '',
    link: headers['Link'] ?? '',
    whiteElo: headers['WhiteElo'] ?? '0',
    blackElo: headers['BlackElo'] ?? '0',
  };
}

// ---------------------------------------------------------------------------
// Result resolution
// ---------------------------------------------------------------------------

function resolveResult(resultHeader: string, playerColor: PlayerColor): GameResult {
  if (resultHeader === '1-0') return playerColor === 'white' ? 'win' : 'loss';
  if (resultHeader === '0-1') return playerColor === 'black' ? 'win' : 'loss';
  return 'draw';
}

function resolvePlayerColor(headers: PgnHeaders, username: string): PlayerColor | null {
  const lower = username.toLowerCase();
  if (headers.white.toLowerCase() === lower) return 'white';
  if (headers.black.toLowerCase() === lower) return 'black';
  return null;
}

// ---------------------------------------------------------------------------
// Accumulator — builds a map of opening key → outcomes
// ---------------------------------------------------------------------------

interface AccumulatorEntry {
  eco: string;
  name: string;
  asWhite: GameOutcome[];
  asBlack: GameOutcome[];
}

function buildAccumulator(
  games: readonly ChessComGame[],
  username: string,
): Map<string, AccumulatorEntry> {
  const map = new Map<string, AccumulatorEntry>();

  for (const game of games) {
    if (!game.pgn) continue;

    const headers = extractHeaders(game.pgn);
    const playerColor = resolvePlayerColor(headers, username);
    if (!playerColor) continue;

    const eco = headers.eco || 'UNK';
    const name = prettifyOpeningName(headers.opening);
    const key = `${eco}__${name}`;

    const result = resolveResult(headers.result, playerColor);
    const opponentUsername =
      playerColor === 'white' ? headers.black : headers.white;
    const opponentRating =
      playerColor === 'white'
        ? Number(headers.blackElo)
        : Number(headers.whiteElo);

    const outcome: GameOutcome = {
      result,
      gameUrl: headers.link || game.url,
      opponentUsername,
      opponentRating,
    };

    if (!map.has(key)) {
      map.set(key, { eco, name, asWhite: [], asBlack: [] });
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- guarded by has() above
    const entry = map.get(key)!;
    if (playerColor === 'white') {
      entry.asWhite.push(outcome);
    } else {
      entry.asBlack.push(outcome);
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Stats calculation
// ---------------------------------------------------------------------------

function computeStats(entry: AccumulatorEntry): OpeningStats {
  const countBucket = (outcomes: readonly GameOutcome[]) => ({
    wins: outcomes.filter((o) => o.result === 'win').length,
    losses: outcomes.filter((o) => o.result === 'loss').length,
    draws: outcomes.filter((o) => o.result === 'draw').length,
  });

  const asWhite = countBucket(entry.asWhite);
  const asBlack = countBucket(entry.asBlack);

  const wins = asWhite.wins + asBlack.wins;
  const losses = asWhite.losses + asBlack.losses;
  const draws = asWhite.draws + asBlack.draws;
  const totalGames = wins + losses + draws;

  const allOutcomes = [...entry.asWhite, ...entry.asBlack];

  return {
    eco: entry.eco,
    name: entry.name,
    totalGames,
    wins,
    losses,
    draws,
    winRate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
    lossRate: totalGames > 0 ? (losses / totalGames) * 100 : 0,
    asWhite,
    asBlack,
    gameUrls: allOutcomes.map((o) => o.gameUrl),
    lossGameUrls: allOutcomes
      .filter((o) => o.result === 'loss')
      .map((o) => o.gameUrl),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pure function: calculates win/loss/draw stats per opening from raw games.
 * No React, no hooks, no side effects — safe to memoize.
 */
export function calculateLeaks(
  games: readonly ChessComGame[],
  username: string,
): readonly OpeningStats[] {
  const accumulator = buildAccumulator(games, username);
  const stats: OpeningStats[] = [];

  for (const entry of accumulator.values()) {
    stats.push(computeStats(entry));
  }

  return stats.sort((a, b) => b.totalGames - a.totalGames);
}

/**
 * Filters to openings with at least `minGames` played, then returns
 * the `count` worst-performing openings sorted by highest loss rate.
 */
export function getWorstOpenings(
  allStats: readonly OpeningStats[],
  minGames = 5,
  count = 5,
): readonly OpeningStats[] {
  return allStats
    .filter((s) => s.totalGames >= minGames)
    .sort((a, b) => b.lossRate - a.lossRate)
    .slice(0, count);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function prettifyOpeningName(raw: string): string {
  return raw
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || 'Unknown Opening';
}
