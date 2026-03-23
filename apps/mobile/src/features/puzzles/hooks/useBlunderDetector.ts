import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { StockfishEngineHandle } from '../../../core/engine/StockfishEngine';
import { parsePgn } from '../../../core/parser/pgnParser';
import type {
  BlunderDetectorResult,
  BlunderPuzzle,
  EngineEvaluation,
  ParsedGame,
  PlayerColor,
} from '../../../shared/types';

const EVAL_DEPTH = 12;
const BLUNDER_THRESHOLD_CP = 250;
const ALREADY_LOST_THRESHOLD_CP = -200;

/**
 * Hook for analyzing a single game for blunders.
 * Evaluations are done SEQUENTIALLY — the engine handles one position at a time.
 */
export function useBlunderDetector(
  pgn: string | null,
  username: string,
  gameId: string,
): BlunderDetectorResult & {
  analyze: (engine: StockfishEngineHandle) => Promise<void>;
} {
  const [blunders, setBlunders] = useState<readonly BlunderPuzzle[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const analyze = useCallback(
    async (engine: StockfishEngineHandle) => {
      if (!pgn) {
        setError('No PGN provided');
        return;
      }

      cancelledRef.current = false;
      setIsAnalyzing(true);
      setError(null);
      setBlunders([]);
      setProgress(0);

      try {
        const game = parsePgn(pgn, username, gameId);
        const found: BlunderPuzzle[] = [];

        let prevEval: EngineEvaluation | null = null;

        for (let i = 0; i < game.moves.length; i++) {
          if (cancelledRef.current) break;

          const move = game.moves[i];
          const isPlayerMove = move.color === game.playerColor;

          if (isPlayerMove && prevEval !== null) {
            const evalAfter = await engine.evaluate({
              fen: move.fen,
              depth: EVAL_DEPTH,
            });

            const scoreBefore = normalizeScore(prevEval, game.playerColor);
            const scoreAfter = normalizeScore(evalAfter, game.playerColor);
            const drop = scoreBefore - scoreAfter;

            if (
              drop >= BLUNDER_THRESHOLD_CP &&
              scoreBefore >= ALREADY_LOST_THRESHOLD_CP
            ) {
              const fenBefore = getFenBefore(game, i);
              const bestMoveSan = uciToSan(fenBefore, prevEval.bestMove);

              found.push({
                gameId: game.gameId,
                moveNumber: move.moveNumber,
                fenBeforeBlunder: fenBefore,
                fenAfterBlunder: move.fen,
                badMove: move.san,
                bestMove: prevEval.bestMove,
                bestMoveSan,
                evalBefore: scoreBefore,
                evalAfter: scoreAfter,
                evalDrop: drop,
                playerColor: game.playerColor,
              });
            }

            prevEval = evalAfter;
          } else {
            prevEval = await engine.evaluate({
              fen: move.fen,
              depth: EVAL_DEPTH,
            });
          }

          setProgress(Math.round(((i + 1) / game.moves.length) * 100));
        }

        setBlunders(found);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Analysis failed';
        setError(message);
      } finally {
        setIsAnalyzing(false);
      }
    },
    [pgn, username, gameId],
  );

  return { blunders, isAnalyzing, progress, error, analyze };
}

function getFenBefore(game: ParsedGame, moveIndex: number): string {
  if (moveIndex === 0) {
    return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }
  return game.moves[moveIndex - 1].fen;
}

function normalizeScore(
  evaluation: EngineEvaluation,
  color: PlayerColor,
): number {
  return color === 'white' ? evaluation.score : -evaluation.score;
}

function uciToSan(fen: string, uci: string): string {
  if (!uci || uci.length < 4) return uci;
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion:
        uci.length > 4
          ? (uci[4] as 'q' | 'r' | 'b' | 'n')
          : undefined,
    });
    return move ? move.san : uci;
  } catch {
    return uci;
  }
}
