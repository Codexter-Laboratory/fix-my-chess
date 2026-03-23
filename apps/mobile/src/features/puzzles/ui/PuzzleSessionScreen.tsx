import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Chess, type Square } from 'chess.js';
import { ChessBoard } from '../../../shared/ui/ChessBoard';
import { useAnalysisStore } from '../../../core/stores/useAnalysisStore';
import type { BlunderPuzzle } from '../../../shared/types';
import type { PuzzleSessionScreenProps } from '../../../app/navigation/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 40, 400);
const MAX_ATTEMPTS_BEFORE_GIVEUP = 3;

type PuzzleStatus = 'playing' | 'correct' | 'wrong' | 'gaveUp';

function hintSquareFromUci(uci: string): string {
  return uci.length >= 2 ? uci.slice(0, 2) : '';
}

function buildInstruction(puzzle: BlunderPuzzle): string {
  const dropPawns = (puzzle.evalDrop / 100).toFixed(1);
  return (
    `You played ${puzzle.badMove} (−${dropPawns} pawns). ` +
    `Find the engine's best move.`
  );
}

const PLAYER_COLOR_MAP = { white: 'w', black: 'b' } as const;

export function PuzzleSessionScreen({
  navigation,
}: PuzzleSessionScreenProps): React.ReactElement {
  const blunders = useAnalysisStore((s) => s.blunders);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [status, setStatus] = useState<PuzzleStatus>('playing');
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [boardFen, setBoardFen] = useState('');
  const [lastMove, setLastMove] = useState<string[]>([]);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puzzle: BlunderPuzzle | undefined = blunders[currentIndex];
  const total = blunders.length;
  const isLast = currentIndex === total - 1;

  useEffect(() => {
    if (puzzle) {
      setBoardFen(puzzle.fenBeforeBlunder);
      setSelectedSquare(null);
      setStatus('playing');
      setAttempts(0);
      setShowHint(false);
      setLastMove([]);
      setFlashColor(null);
    }
  }, [puzzle]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const chess = useMemo(() => {
    if (!boardFen) return null;
    try {
      return new Chess(boardFen);
    } catch {
      return null;
    }
  }, [boardFen]);

  const legalMoves = useMemo(() => {
    if (!chess || !selectedSquare) return [];
    try {
      const moves = chess.moves({ square: selectedSquare as Square, verbose: true });
      return moves.map((m: { to: string }) => m.to);
    } catch {
      return [];
    }
  }, [chess, selectedSquare]);

  const highlightSquares = useMemo(() => {
    if (!showHint || !puzzle) return [];
    return [hintSquareFromUci(puzzle.bestMove)];
  }, [showHint, puzzle]);

  const flash = useCallback((color: string) => {
    setFlashColor(color);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashColor(null), 600);
  }, []);

  const handleSquarePress = useCallback(
    (square: string) => {
      if (status !== 'playing' || !chess || !puzzle) return;

      const pieceAt = chess.get(square as Square);

      const playerSide = PLAYER_COLOR_MAP[puzzle.playerColor];

      if (selectedSquare) {
        if (square === selectedSquare) {
          setSelectedSquare(null);
          return;
        }

        if (pieceAt && pieceAt.color === playerSide) {
          setSelectedSquare(square);
          return;
        }

        const uciMove = selectedSquare + square;
        const bestUci = puzzle.bestMove;
        const srcPiece = chess.get(selectedSquare as Square);

        const isPromotion =
          srcPiece && srcPiece.type === 'p' &&
          (square[1] === '8' || square[1] === '1');

        const fullUci = isPromotion ? uciMove + 'q' : uciMove;

        const isCorrect =
          fullUci === bestUci ||
          uciMove === bestUci.slice(0, 4);

        try {
          chess.move({
            from: selectedSquare as Square,
            to: square as Square,
            promotion: isPromotion ? 'q' : undefined,
          });
        } catch {
          setSelectedSquare(null);
          return;
        }

        if (isCorrect) {
          setBoardFen(chess.fen());
          setLastMove([selectedSquare, square]);
          setSelectedSquare(null);
          setStatus('correct');
          setAttempts((a) => a + 1);
          flash('#22c55e');
        } else {
          chess.undo();
          setSelectedSquare(null);
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setStatus('wrong');
          flash('#ef4444');

          setTimeout(() => {
            setStatus('playing');
          }, 800);
        }
      } else {
        if (pieceAt && pieceAt.color === playerSide) {
          setSelectedSquare(square);
        }
      }
    },
    [chess, selectedSquare, puzzle, status, attempts, flash],
  );

  const handleHint = useCallback(() => {
    setShowHint(true);
    if (puzzle) {
      setSelectedSquare(hintSquareFromUci(puzzle.bestMove));
    }
  }, [puzzle]);

  const handleGiveUp = useCallback(() => {
    if (!puzzle || !chess) return;
    setStatus('gaveUp');
    try {
      const bm = puzzle.bestMove;
      chess.move({
        from: bm.slice(0, 2) as Square,
        to: bm.slice(2, 4) as Square,
        promotion: bm.length > 4 ? (bm[4] as 'q' | 'r' | 'b' | 'n') : undefined,
      });
      setBoardFen(chess.fen());
      setLastMove([bm.slice(0, 2), bm.slice(2, 4)]);
    } catch {
      // Move execution failed
    }
    setSelectedSquare(null);
  }, [puzzle, chess]);

  const handleNext = useCallback(() => {
    if (isLast) {
      navigation.goBack();
      return;
    }
    setCurrentIndex((i) => i + 1);
  }, [isLast, navigation]);

  if (!puzzle) {
    return (
      <SafeAreaView
        className="flex-1 bg-slate-950"
        style={{ flex: 1, backgroundColor: '#020617' }}
      >
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg font-medium text-slate-300">
            No blunders to review.
          </Text>
          <TouchableOpacity
            className="mt-6 rounded-xl bg-indigo-600 px-8 py-3"
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text className="text-base font-bold text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const instruction = buildInstruction(puzzle);
  const isFinished = status === 'correct' || status === 'gaveUp';
  const canGiveUp = attempts >= MAX_ATTEMPTS_BEFORE_GIVEUP && status === 'playing';

  const evalBeforeStr =
    puzzle.evalBefore >= 0
      ? `+${(puzzle.evalBefore / 100).toFixed(1)}`
      : (puzzle.evalBefore / 100).toFixed(1);
  const evalAfterStr =
    puzzle.evalAfter >= 0
      ? `+${(puzzle.evalAfter / 100).toFixed(1)}`
      : (puzzle.evalAfter / 100).toFixed(1);

  const borderColor =
    flashColor ??
    (status === 'correct'
      ? '#22c55e'
      : status === 'gaveUp'
        ? '#f59e0b'
        : 'transparent');

  return (
    <SafeAreaView
      className="flex-1 bg-slate-950"
      style={{ flex: 1, backgroundColor: '#020617' }}
    >
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 pb-2 pt-4">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-sm text-slate-400">← Back</Text>
        </TouchableOpacity>
        <Text className="text-sm font-semibold text-slate-300">
          Puzzle {currentIndex + 1} of {total}
        </Text>
        <View className="flex-row gap-1">
          {blunders.map((_, i) => (
            <View
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < currentIndex
                  ? 'bg-emerald-500'
                  : i === currentIndex
                    ? status === 'correct'
                      ? 'bg-emerald-500'
                      : 'bg-indigo-500'
                    : 'bg-slate-700'
              }`}
            />
          ))}
        </View>
      </View>

      {/* Turn indicator */}
      <View className="mb-1 flex-row items-center justify-center gap-2">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor:
              puzzle.playerColor === 'white' ? '#fff' : '#1e293b',
            borderWidth: 1,
            borderColor: '#475569',
          }}
        />
        <Text className="text-xs text-slate-500">
          Your turn as {puzzle.playerColor}
        </Text>
      </View>

      {/* Board */}
      <View className="items-center">
        <View
          style={{
            borderRadius: 8,
            overflow: 'hidden',
            borderWidth: 3,
            borderColor,
          }}
        >
          <ChessBoard
            fen={boardFen || puzzle.fenBeforeBlunder}
            orientation={puzzle.playerColor}
            highlightSquares={highlightSquares}
            lastMoveSquares={lastMove}
            selectedSquare={selectedSquare}
            legalMoveSquares={legalMoves}
            interactive={!isFinished}
            onSquarePress={handleSquarePress}
            size={BOARD_SIZE}
          />
        </View>
      </View>

      {/* Move info badges */}
      <View className="mt-3 flex-row justify-center gap-3">
        <View className="rounded-lg bg-slate-900 px-3 py-1.5">
          <Text className="text-[10px] uppercase text-slate-500">
            You played
          </Text>
          <Text className="font-mono text-sm font-bold text-red-400">
            {puzzle.badMove}
          </Text>
        </View>
        <View className="rounded-lg bg-slate-900 px-3 py-1.5">
          <Text className="text-[10px] uppercase text-slate-500">
            Best move
          </Text>
          <Text className="font-mono text-sm font-bold text-emerald-400">
            {isFinished ? puzzle.bestMoveSan : '???'}
          </Text>
        </View>
        <View className="rounded-lg bg-slate-900 px-3 py-1.5">
          <Text className="text-[10px] uppercase text-slate-500">Eval</Text>
          <Text className="font-mono text-sm font-bold text-slate-300">
            {isFinished ? `${evalBeforeStr} → ${evalAfterStr}` : evalBeforeStr}
          </Text>
        </View>
      </View>

      {/* Instruction / feedback card */}
      <View className="mx-5 mt-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
        {status === 'playing' && (
          <Text className="text-sm leading-5 text-slate-300">
            {instruction} Tap a piece, then tap where it should go.
          </Text>
        )}
        {status === 'wrong' && (
          <Text className="text-sm font-semibold leading-5 text-red-400">
            Not quite — try again!{' '}
            {attempts >= 2 && !canGiveUp && `(${MAX_ATTEMPTS_BEFORE_GIVEUP - attempts} more before you can reveal)`}
          </Text>
        )}
        {status === 'correct' && (
          <View className="rounded-lg bg-emerald-900/30 p-3">
            <Text className="text-center text-sm font-semibold text-emerald-400">
              Correct! The best move was{' '}
              <Text className="font-mono font-bold">
                {puzzle.bestMoveSan}
              </Text>
            </Text>
          </View>
        )}
        {status === 'gaveUp' && (
          <View className="rounded-lg bg-amber-900/30 p-3">
            <Text className="text-center text-sm font-semibold text-amber-400">
              The best move was{' '}
              <Text className="font-mono font-bold">
                {puzzle.bestMoveSan}
              </Text>{' '}
              ({evalBeforeStr} → {evalAfterStr})
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View className="mt-3 flex-row justify-center gap-3 px-5">
        {!isFinished ? (
          <>
            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-3 ${
                showHint
                  ? 'border border-yellow-500/20 bg-yellow-500/10'
                  : 'border border-slate-700 bg-slate-800'
              }`}
              onPress={handleHint}
              disabled={showHint}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-semibold ${
                  showHint ? 'text-yellow-600' : 'text-yellow-400'
                }`}
              >
                {showHint ? 'Hint shown' : 'Show Hint'}
              </Text>
            </TouchableOpacity>

            {canGiveUp && (
              <TouchableOpacity
                className="flex-1 items-center rounded-xl border border-amber-700/30 bg-amber-900/20 py-3"
                onPress={handleGiveUp}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-semibold text-amber-400">
                  Give Up
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="flex-1 items-center rounded-xl border border-slate-700 bg-slate-800 py-3"
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold text-slate-400">
                Skip
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            className="flex-1 items-center rounded-xl bg-emerald-600 py-3.5 active:bg-emerald-700"
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text className="text-base font-bold text-white">
              {isLast ? 'Finish' : 'Next Puzzle →'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Attempt counter */}
      {attempts > 0 && (
        <Text className="mt-2 text-center text-xs text-slate-600">
          {attempts} attempt{attempts !== 1 ? 's' : ''}
        </Text>
      )}
    </SafeAreaView>
  );
}
