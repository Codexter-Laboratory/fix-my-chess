import { Chess } from 'chess.js';
import type { ParsedGame, ParsedMove, PlayerColor } from '../../shared/types';

/**
 * Parses a PGN string and returns a structured game with per-move FEN positions.
 * Pure function — no side effects, no engine calls, no network.
 */
export function parsePgn(pgn: string, username: string, gameId: string): ParsedGame {
  const chess = new Chess();
  chess.loadPgn(pgn);

  const playerColor = resolvePlayerColor(chess, username);
  const moves = extractMoves(pgn);

  return { gameId, playerColor, moves };
}

/**
 * Replays the PGN move-by-move, capturing the FEN *after* each move.
 * Returns every move with its resulting board state.
 */
function extractMoves(pgn: string): ParsedMove[] {
  const replay = new Chess();
  replay.loadPgn(pgn);

  const history = replay.history({ verbose: true });
  const result: ParsedMove[] = [];

  const board = new Chess();

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    board.move(move.san);

    result.push({
      moveNumber: Math.floor(i / 2) + 1,
      san: move.san,
      fen: board.fen(),
      color: move.color === 'w' ? 'white' : 'black',
    });
  }

  return result;
}

function resolvePlayerColor(chess: Chess, username: string): PlayerColor {
  const headers = chess.header();
  const lower = username.toLowerCase();

  if (headers['White']?.toLowerCase() === lower) return 'white';
  if (headers['Black']?.toLowerCase() === lower) return 'black';

  return 'white';
}
