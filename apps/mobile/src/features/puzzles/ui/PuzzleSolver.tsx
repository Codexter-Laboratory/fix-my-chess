import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import Chessboard from 'react-native-chessboardjs';
import type { BlunderPuzzle, PlayerColor } from '../../../shared/types';
import { usePuzzleStore } from '../../../core/stores/usePuzzleStore';
import {
  activeColor,
  getHintSquare,
  validatePuzzleMove,
  type MoveAttempt,
  type MoveVerdict,
} from '../logic/moveValidator';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PuzzleSolverProps {
  puzzle: BlunderPuzzle;
  playerColor: PlayerColor;
  onSolved: () => void;
  onNext: () => void;
}

// ---------------------------------------------------------------------------
// Feedback state
// ---------------------------------------------------------------------------

type FeedbackState = 'idle' | 'correct' | 'incorrect';

const FEEDBACK_DURATION_MS = 600;
const SHAKE_OFFSET = 12;
const SHAKE_DURATION = 60;

// ---------------------------------------------------------------------------
// Board colors (dark analytical theme)
// ---------------------------------------------------------------------------

const DARK_SQUARE = { backgroundColor: '#334155' }; // slate-700
const LIGHT_SQUARE = { backgroundColor: '#94a3b8' }; // slate-400
const HINT_HIGHLIGHT = { backgroundColor: 'rgba(250, 204, 21, 0.45)' }; // yellow overlay
const CORRECT_BORDER_COLOR = '#22c55e'; // green-500
const INCORRECT_BORDER_COLOR = '#ef4444'; // red-500

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PuzzleSolver = React.memo(function PuzzleSolver({
  puzzle,
  playerColor,
  onSolved,
  onNext,
}: PuzzleSolverProps) {
  const { markSolved, recordFailedAttempt, lives } = usePuzzleStore();

  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [hintVisible, setHintVisible] = useState(false);
  const [solved, setSolved] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shake animation (simple state-based, no reanimated dependency)
  const [shakeOffset, setShakeOffset] = useState(0);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----- Hint square styles (memoized so board doesn't re-render) -----
  const hintSquareStyles = useMemo(() => {
    if (!hintVisible || solved) return {};
    const sq = getHintSquare(puzzle.bestMove);
    return { [sq]: HINT_HIGHLIGHT };
  }, [hintVisible, solved, puzzle.bestMove]);

  // ----- Border color driven by feedback state -----
  const boardBorderStyle = useMemo(() => {
    if (feedback === 'correct') return { borderColor: CORRECT_BORDER_COLOR, borderWidth: 3 };
    if (feedback === 'incorrect') return { borderColor: INCORRECT_BORDER_COLOR, borderWidth: 3 };
    return { borderColor: 'transparent', borderWidth: 3 };
  }, [feedback]);

  // ----- Clear previous feedback timer -----
  const clearFeedbackTimer = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
  }, []);

  // ----- Trigger haptic (best-effort, no crash if unavailable) -----
  const triggerHaptic = useCallback((type: 'success' | 'error') => {
    try {
      const ReactNativeHaptic = require('react-native');
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        ReactNativeHaptic.Vibration?.vibrate?.(type === 'success' ? 50 : [0, 30, 50, 30]);
      }
    } catch {
      // Haptic unavailable — non-critical
    }
  }, []);

  // ----- Handle piece drop -----
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string): boolean => {
      if (solved || lives <= 0) return false;

      const attempt: MoveAttempt = {
        from: sourceSquare,
        to: targetSquare,
        promotion: isPawnPromotion(piece, targetSquare) ? 'q' : undefined,
      };

      const verdict: MoveVerdict = validatePuzzleMove(
        puzzle.fenBeforeBlunder,
        attempt,
        puzzle.bestMove,
      );

      if (verdict === 'illegal') return false;

      clearFeedbackTimer();

      if (verdict === 'correct') {
        setFeedback('correct');
        setSolved(true);
        setHintVisible(false);
        markSolved();
        triggerHaptic('success');
        onSolved();
        return true;
      }

      // Incorrect
      setFeedback('incorrect');
      recordFailedAttempt();
      triggerHaptic('error');

      // Shake animation (JS-driven)
      const steps = [SHAKE_OFFSET, -SHAKE_OFFSET, SHAKE_OFFSET, -SHAKE_OFFSET, 0];
      let i = 0;
      if (shakeTimerRef.current) clearInterval(shakeTimerRef.current);
      shakeTimerRef.current = setInterval(() => {
        if (i < steps.length) {
          setShakeOffset(steps[i]);
          i++;
        } else {
          if (shakeTimerRef.current) clearInterval(shakeTimerRef.current);
        }
      }, SHAKE_DURATION);

      feedbackTimerRef.current = setTimeout(() => {
        setFeedback('idle');
      }, FEEDBACK_DURATION_MS);

      return false; // snap piece back
    },
    [
      solved,
      lives,
      puzzle.fenBeforeBlunder,
      puzzle.bestMove,
      clearFeedbackTimer,
      markSolved,
      recordFailedAttempt,
      triggerHaptic,
      onSolved,
    ],
  );

  // ----- Only allow dragging the side-to-move's pieces -----
  const isDraggable = useCallback(
    ({ piece }: { piece: string }): boolean => {
      if (solved || lives <= 0) return false;
      const colorToMove = activeColor(puzzle.fenBeforeBlunder);
      const pieceColor = piece[0] === 'w' ? 'white' : 'black';
      return pieceColor === colorToMove;
    },
    [solved, lives, puzzle.fenBeforeBlunder],
  );

  // ----- Render -----
  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="px-4 pb-2 pt-4">
        <Text className="text-center text-lg font-semibold text-slate-100">
          Find the best move
        </Text>
        <Text className="mt-1 text-center text-xs text-slate-400">
          Move {puzzle.moveNumber} · You played{' '}
          <Text className="font-mono text-red-400">{puzzle.badMove}</Text>
        </Text>
      </View>

      {/* Lives indicator */}
      <View className="mb-2 flex-row items-center justify-center gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${i < lives ? 'bg-emerald-400' : 'bg-slate-700'}`}
          />
        ))}
      </View>

      {/* Board with shake + border feedback */}
      <View
        style={[
          boardBorderStyle,
          { borderRadius: 4, alignSelf: 'center', transform: [{ translateX: shakeOffset }] },
        ]}
      >
        <Chessboard
          position={puzzle.fenBeforeBlunder}
          boardOrientation={playerColor}
          onPieceDrop={handlePieceDrop}
          isDraggablePiece={isDraggable}
          customDarkSquareStyle={DARK_SQUARE}
          customLightSquareStyle={LIGHT_SQUARE}
          customSquareStyles={hintSquareStyles}
          arePremovesAllowed={false}
        />
      </View>

      {/* Eval context */}
      <View className="mt-3 flex-row justify-center gap-4">
        <EvalBadge label="Before" value={puzzle.evalBefore} />
        <EvalBadge label="After" value={puzzle.evalAfter} />
        <EvalBadge label="Drop" value={-puzzle.evalDrop} negative />
      </View>

      {/* Action buttons */}
      <View className="mt-4 flex-row justify-center gap-3 px-6">
        {!solved && lives > 0 && (
          <TouchableOpacity
            className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-5 py-2.5"
            onPress={() => setHintVisible(true)}
            disabled={hintVisible}
          >
            <Text className={`font-medium ${hintVisible ? 'text-yellow-700' : 'text-yellow-400'}`}>
              {hintVisible ? 'Hint shown' : 'Show Hint'}
            </Text>
          </TouchableOpacity>
        )}

        {solved && (
          <TouchableOpacity
            className="rounded-lg bg-emerald-600 px-6 py-2.5"
            onPress={onNext}
          >
            <Text className="font-semibold text-white">Next Puzzle</Text>
          </TouchableOpacity>
        )}

        {lives <= 0 && !solved && (
          <View className="items-center">
            <Text className="mb-2 text-sm text-red-400">
              Out of tries! The best move was{' '}
              <Text className="font-mono font-bold">{puzzle.bestMove}</Text>
            </Text>
            <TouchableOpacity
              className="rounded-lg bg-slate-700 px-6 py-2.5"
              onPress={onNext}
            >
              <Text className="font-semibold text-slate-100">Next Puzzle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Sub-components (kept private — rendering only)
// ---------------------------------------------------------------------------

function EvalBadge({
  label,
  value,
  negative,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  const display = (value / 100).toFixed(1);
  const color = negative ? 'text-red-400' : value >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <View className="items-center">
      <Text className="text-[10px] uppercase tracking-widest text-slate-500">{label}</Text>
      <Text className={`font-mono text-sm font-semibold ${color}`}>
        {value >= 0 && !negative ? '+' : ''}
        {display}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPawnPromotion(piece: string, targetSquare: string): boolean {
  const rank = targetSquare[1];
  if (piece[1] !== 'p') return false;
  return (piece[0] === 'w' && rank === '8') || (piece[0] === 'b' && rank === '1');
}
