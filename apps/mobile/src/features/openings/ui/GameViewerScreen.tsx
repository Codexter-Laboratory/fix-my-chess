import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Chess } from 'chess.js';
import { ChessBoard } from '../../../shared/ui/ChessBoard';
import { useAnalysisStore } from '../../../core/stores/useAnalysisStore';
import type { GameViewerScreenProps } from '../../../app/navigation/types';
import type { PlayerColor } from '../../../shared/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOARD_SIZE = Math.min(SCREEN_WIDTH - 32, 420);

interface ReplayState {
  fens: string[];
  moves: { san: string; color: 'w' | 'b' }[];
  playerColor: PlayerColor;
  opponentName: string;
  result: string;
}

function buildReplay(pgn: string, username: string): ReplayState | null {
  try {
    const chess = new Chess();
    chess.loadPgn(pgn);

    const headers = chess.header();
    const isWhite = headers['White']?.toLowerCase() === username.toLowerCase();
    const playerColor: PlayerColor = isWhite ? 'white' : 'black';
    const opponentName = isWhite
      ? headers['Black'] ?? 'Unknown'
      : headers['White'] ?? 'Unknown';
    const result = headers['Result'] ?? '*';

    const history = chess.history({ verbose: true });

    const board = new Chess();
    const fens = [board.fen()];
    const moves: { san: string; color: 'w' | 'b' }[] = [];

    for (const move of history) {
      board.move(move.san);
      fens.push(board.fen());
      moves.push({ san: move.san, color: move.color });
    }

    return { fens, moves, playerColor, opponentName, result };
  } catch {
    return null;
  }
}

export function GameViewerScreen({
  navigation,
  route,
}: GameViewerScreenProps): React.ReactElement {
  const { gameUrl } = route.params;
  const { games, username } = useAnalysisStore();

  const game = useMemo(
    () => games.find((g) => g.url === gameUrl),
    [games, gameUrl],
  );

  const replay = useMemo(() => {
    if (!game?.pgn) return null;
    return buildReplay(game.pgn, username);
  }, [game, username]);

  const [moveIndex, setMoveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const orientation = useMemo((): PlayerColor => {
    if (!replay) return 'white';
    return flipped
      ? replay.playerColor === 'white'
        ? 'black'
        : 'white'
      : replay.playerColor;
  }, [replay, flipped]);

  const lastMoveSquares = useMemo(() => {
    if (!replay || moveIndex === 0) return [];
    const move = replay.moves[moveIndex - 1];
    if (!move) return [];
    const chess = new Chess(replay.fens[moveIndex - 1]);
    const verbose = chess.moves({ verbose: true }).find((m) => m.san === move.san);
    return verbose ? [verbose.from, verbose.to] : [];
  }, [replay, moveIndex]);

  const handlePrev = useCallback(() => {
    setMoveIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (!replay) return;
    setMoveIndex((i) => Math.min(replay.fens.length - 1, i + 1));
  }, [replay]);

  const handleFlip = useCallback(() => {
    setFlipped((f) => !f);
  }, []);

  const handleStart = useCallback(() => {
    setMoveIndex(0);
  }, []);

  const handleEnd = useCallback(() => {
    if (!replay) return;
    setMoveIndex(replay.fens.length - 1);
  }, [replay]);

  if (!game || !replay) {
    return (
      <SafeAreaView
        className="flex-1 bg-slate-950"
        style={{ flex: 1, backgroundColor: '#020617' }}
      >
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg font-medium text-slate-300">
            Game not found.
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

  const totalMoves = replay.fens.length - 1;
  const currentMove = moveIndex > 0 ? replay.moves[moveIndex - 1] : null;
  const moveLabel = currentMove
    ? `${Math.ceil(moveIndex / 2)}${currentMove.color === 'b' ? '...' : '.'} ${currentMove.san}`
    : 'Starting position';

  const resultLabel =
    replay.result === '1-0'
      ? 'White wins'
      : replay.result === '0-1'
        ? 'Black wins'
        : replay.result === '1/2-1/2'
          ? 'Draw'
          : replay.result;

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
          Game Review
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Opponent info */}
      <View className="flex-row items-center justify-center gap-2 pb-2">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: replay.playerColor === 'white' ? '#fff' : '#1e293b',
            borderWidth: 1,
            borderColor: '#475569',
          }}
        />
        <Text className="text-xs text-slate-500">
          You ({replay.playerColor}) vs {replay.opponentName} · {resultLabel}
        </Text>
      </View>

      {/* Board */}
      <View className="items-center">
        <View style={{ borderRadius: 8, overflow: 'hidden' }}>
          <ChessBoard
            fen={replay.fens[moveIndex]}
            orientation={orientation}
            lastMoveSquares={lastMoveSquares}
            size={BOARD_SIZE}
          />
        </View>
      </View>

      {/* Move label */}
      <View className="mt-3 items-center">
        <View className="rounded-lg bg-slate-900 px-4 py-2">
          <Text className="font-mono text-sm text-slate-300">
            {moveLabel}
          </Text>
        </View>
        <Text className="mt-1 text-[10px] text-slate-600">
          Move {moveIndex} of {totalMoves}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="mx-8 mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
        <View
          className="h-full rounded-full bg-indigo-500"
          style={{ width: totalMoves > 0 ? `${(moveIndex / totalMoves) * 100}%` : '0%' }}
        />
      </View>

      {/* Controls */}
      <View className="mt-4 flex-row items-center justify-center gap-2 px-5">
        <ControlButton label="⏮" onPress={handleStart} disabled={moveIndex === 0} />
        <ControlButton label="◀" onPress={handlePrev} disabled={moveIndex === 0} wide />
        <ControlButton label="⟳" onPress={handleFlip} />
        <ControlButton label="▶" onPress={handleNext} disabled={moveIndex >= totalMoves} wide />
        <ControlButton label="⏭" onPress={handleEnd} disabled={moveIndex >= totalMoves} />
      </View>

      {/* Move list (compact scrollable row) */}
      <View className="mx-5 mt-4 flex-row flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-900 p-3">
        {replay.moves.slice(0, 40).map((m, i) => {
          const isActive = i === moveIndex - 1;
          const moveNum = Math.floor(i / 2) + 1;
          const showNum = i % 2 === 0;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setMoveIndex(i + 1)}
              activeOpacity={0.7}
            >
              <Text
                className={`font-mono text-xs ${
                  isActive
                    ? 'rounded bg-indigo-600 px-1.5 py-0.5 font-bold text-white'
                    : 'px-0.5 text-slate-500'
                }`}
              >
                {showNum ? `${moveNum}.` : ''}{m.san}
              </Text>
            </TouchableOpacity>
          );
        })}
        {replay.moves.length > 40 && (
          <Text className="px-1 text-xs text-slate-600">…</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function ControlButton({
  label,
  onPress,
  disabled = false,
  wide = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`items-center justify-center rounded-xl ${
        wide ? 'px-6' : 'px-4'
      } py-3 ${disabled ? 'bg-slate-900' : 'bg-slate-800'}`}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text
        className={`text-base ${disabled ? 'text-slate-700' : 'text-slate-300'}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
