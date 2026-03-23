import { Chess } from 'chess.js';
import type { StockfishEngineHandle } from './StockfishEngine';
import { parsePgn } from '../parser/pgnParser';
import type {
  BlunderPuzzle,
  ChessComGame,
  EngineEvaluation,
  ParsedGame,
  PlayerColor,
} from '../../shared/types';

const EVAL_DEPTH = 12;
const BLUNDER_THRESHOLD_CP = 250;
const ALREADY_LOST_THRESHOLD_CP = -200;
const MAX_BLUNDERS_PER_GAME = 3;
const MAX_TOTAL_BLUNDERS = 10;

export interface AnalysisProgress {
  gameIndex: number;
  totalGames: number;
  moveIndex: number;
  totalMoves: number;
  blundersFound: number;
}

/**
 * Analyzes multiple games for blunders using a Stockfish engine.
 * Evaluations are done SEQUENTIALLY — the engine handles one position at a time.
 */
export async function analyzeGamesForBlunders(
  engine: StockfishEngineHandle,
  games: readonly ChessComGame[],
  username: string,
  onProgress?: (progress: AnalysisProgress) => void,
): Promise<BlunderPuzzle[]> {
  const allBlunders: BlunderPuzzle[] = [];

  for (let gi = 0; gi < games.length; gi++) {
    if (allBlunders.length >= MAX_TOTAL_BLUNDERS) break;

    const game = games[gi];
    if (!game.pgn) continue;

    try {
      const gameBlunders = await analyzeOneGame(
        engine,
        game,
        username,
        (moveIndex, totalMoves) => {
          onProgress?.({
            gameIndex: gi,
            totalGames: games.length,
            moveIndex,
            totalMoves,
            blundersFound: allBlunders.length,
          });
        },
      );

      allBlunders.push(...gameBlunders);
    } catch {
      // If a single game fails, skip it and continue
    }
  }

  return allBlunders;
}

async function analyzeOneGame(
  engine: StockfishEngineHandle,
  game: ChessComGame,
  username: string,
  onMoveProgress?: (moveIndex: number, totalMoves: number) => void,
): Promise<BlunderPuzzle[]> {
  const gameId = game.url.split('/').pop() ?? game.url;
  const parsed = parsePgn(game.pgn, username, gameId);
  const playerMoveIndices = getPlayerMoveIndices(parsed);
  const blunders: BlunderPuzzle[] = [];

  let prevEval: EngineEvaluation | null = null;

  for (let i = 0; i < parsed.moves.length; i++) {
    onMoveProgress?.(i, parsed.moves.length);

    const move = parsed.moves[i];
    const isPlayerMove = move.color === parsed.playerColor;

    if (isPlayerMove && prevEval !== null) {
      const evalAfter = await engine.evaluate({
        fen: move.fen,
        depth: EVAL_DEPTH,
      });

      const scoreBefore = normalizeScore(prevEval, parsed.playerColor);
      const scoreAfter = normalizeScore(evalAfter, parsed.playerColor);
      const drop = scoreBefore - scoreAfter;

      if (drop >= BLUNDER_THRESHOLD_CP && scoreBefore >= ALREADY_LOST_THRESHOLD_CP) {
        const fenBefore = getFenBefore(parsed, i);
        const bestMoveSan = uciToSan(fenBefore, prevEval.bestMove);

        blunders.push({
          gameId: parsed.gameId,
          moveNumber: move.moveNumber,
          fenBeforeBlunder: fenBefore,
          fenAfterBlunder: move.fen,
          badMove: move.san,
          bestMove: prevEval.bestMove,
          bestMoveSan,
          evalBefore: scoreBefore,
          evalAfter: scoreAfter,
          evalDrop: drop,
          playerColor: parsed.playerColor,
        });

        if (blunders.length >= MAX_BLUNDERS_PER_GAME) break;
      }

      prevEval = evalAfter;
    } else {
      prevEval = await engine.evaluate({
        fen: move.fen,
        depth: EVAL_DEPTH,
      });
    }
  }

  return blunders;
}

function getPlayerMoveIndices(game: ParsedGame): number[] {
  return game.moves
    .map((move, index) => ({ move, index }))
    .filter(({ move }) => move.color === game.playerColor)
    .map(({ index }) => index);
}

function getFenBefore(game: ParsedGame, moveIndex: number): string {
  if (moveIndex === 0) {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }
  return game.moves[moveIndex - 1].fen;
}

function normalizeScore(evaluation: EngineEvaluation, color: PlayerColor): number {
  return color === 'white' ? evaluation.score : -evaluation.score;
}

/**
 * Converts a UCI move (e.g. "b1c3") to SAN (e.g. "Nc3") using chess.js.
 * Returns the raw UCI string if conversion fails.
 */
function uciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return uci;

  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined,
    });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}
