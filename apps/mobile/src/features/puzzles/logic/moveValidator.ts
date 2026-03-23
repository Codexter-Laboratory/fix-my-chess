import { Chess } from 'chess.js';
import type { PlayerColor } from '../../../shared/types';

/**
 * A UCI move string looks like "e2e4" or "e7e8q" (with promotion).
 * The board library gives us source/target squares + piece.
 */

export type Square = string;

export interface MoveAttempt {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export type MoveVerdict = 'correct' | 'incorrect' | 'illegal';

/**
 * Pure validation — does the player's attempted move match the engine's best
 * move for this position?  Also checks legality via chess.js.
 *
 * `bestMoveUci` is the UCI string from Stockfish (e.g. "e2e4", "g7g8q").
 */
export function validatePuzzleMove(
  fen: string,
  attempt: MoveAttempt,
  bestMoveUci: string,
): MoveVerdict {
  if (!isLegalMove(fen, attempt)) return 'illegal';

  const attemptUci = toUci(attempt);
  const normalizedBest = bestMoveUci.toLowerCase().trim();

  return attemptUci === normalizedBest ? 'correct' : 'incorrect';
}

/**
 * Returns the square the hint piece sits on — the *from* square
 * of the best move, without revealing the destination.
 */
export function getHintSquare(bestMoveUci: string): Square {
  return bestMoveUci.slice(0, 2);
}

/**
 * Derives which color should move in a given FEN.
 */
export function activeColor(fen: string): PlayerColor {
  const parts = fen.split(' ');
  return parts[1] === 'b' ? 'black' : 'white';
}

/**
 * Returns the FEN after a legal move is applied, or `null` if illegal.
 */
export function applyMove(fen: string, move: MoveAttempt): string | null {
  const chess = new Chess(fen);
  try {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    return chess.fen();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function isLegalMove(fen: string, move: MoveAttempt): boolean {
  const chess = new Chess(fen);
  try {
    chess.move({ from: move.from, to: move.to, promotion: move.promotion });
    return true;
  } catch {
    return false;
  }
}

function toUci(move: MoveAttempt): string {
  const base = `${move.from}${move.to}`;
  return move.promotion ? `${base}${move.promotion}` : base;
}
