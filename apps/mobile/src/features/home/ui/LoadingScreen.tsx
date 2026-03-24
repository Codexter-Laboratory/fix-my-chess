import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { useAnalysisStore } from '../../../core/stores/useAnalysisStore';
import type { WinLossStats } from '../../../core/stores/useAnalysisStore';
import { fetchRecentGames } from '../../../core/api/chessCom';
import { calculateLeaks } from '../../openings/logic/calculateLeaks';
import type { ChessComGame } from '../../../shared/types';
import {
  StockfishEngine,
  analyzeGamesForBlunders,
  createWebStockfish,
} from '../../../core/engine';
import type { StockfishEngineHandle } from '../../../core/engine';
import type { LoadingScreenProps } from '../../../app/navigation/types';

const IS_WEB = Platform.OS === 'web';

const MONTHS_TO_FETCH = 3;

const PHASE_LABELS: Record<string, string> = {
  fetching: `Fetching last ${MONTHS_TO_FETCH} months from Chess.com…`,
  analyzing: 'Crunching opening statistics…',
  detecting: 'Running Stockfish — finding your blunders…',
  complete: 'Done!',
  error: 'Something went wrong.',
};

function computeWinLoss(games: readonly ChessComGame[], username: string): WinLossStats {
  const lower = username.toLowerCase();
  let wins = 0;
  let losses = 0;

  for (const g of games) {
    const isWhite = g.white.username.toLowerCase() === lower;
    const ownResult = isWhite ? g.white.result : g.black.result;
    const oppResult = isWhite ? g.black.result : g.white.result;

    if (ownResult === 'win') wins++;
    else if (oppResult === 'win') losses++;
  }

  return {
    totalGames: games.length,
    wins,
    losses,
    draws: games.length - wins - losses,
  };
}

export function LoadingScreen({
  navigation,
  route,
}: LoadingScreenProps): React.ReactElement {
  const { username } = route.params;
  const store = useAnalysisStore();
  const hasStarted = useRef(false);
  const engineRef = useRef<StockfishEngineHandle>(null);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    void runAnalysis();

    async function runAnalysis() {
      let webEngine: StockfishEngineHandle | null = null;

      try {
        store.setUsername(username);
        store.setPhase('fetching');
        store.setProgress(0);

        const games = await fetchRecentGames(
          username,
          MONTHS_TO_FETCH,
          (fetched, total) => {
            store.setProgress(Math.round((fetched / total) * 25));
          },
        );

        if (games.length === 0) {
          navigation.replace('Home');
          return;
        }

        store.setGames(games);
        store.setWinLossStats(computeWinLoss(games, username));
        store.setProgress(30);
        store.setPhase('analyzing');

        const stats = calculateLeaks(games, username);
        store.setOpeningStats(stats);
        store.setProgress(50);

        store.setPhase('detecting');

        let engine: StockfishEngineHandle | null = null;

        if (IS_WEB) {
          webEngine = createWebStockfish();
          engine = webEngine;
        } else if (engineRef.current) {
          engine = engineRef.current;
        }

        if (engine) {
          try {
            await engine.waitUntilReady();

            const blunders = await analyzeGamesForBlunders(
              engine,
              games,
              username,
              (progress) => {
                const gamePercent =
                  progress.totalGames > 0
                    ? progress.gameIndex / progress.totalGames
                    : 0;
                store.setProgress(50 + Math.round(gamePercent * 45));
              },
            );

            store.setBlunders(blunders);
          } catch (engineErr: unknown) {
            // Engine failure is non-fatal — user still gets opening stats
            // eslint-disable-next-line no-console
            console.warn('[Fix My Chess] Engine analysis failed:', engineErr);
          }
        }

        store.setProgress(100);
        store.setPhase('complete');
        store.markFetched();

        navigation.replace('Dashboard');
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch games';
        store.setError(message);
      } finally {
        webEngine?.destroy?.();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView
      className="flex-1 bg-slate-950"
      style={{ flex: 1, backgroundColor: '#020617' }}
    >
      {!IS_WEB && <StockfishEngine ref={engineRef} />}

      <View className="flex-1 items-center justify-center px-8">
        {store.phase !== 'error' ? (
          <>
            <ActivityIndicator size="large" color="#94a3b8" />
            <Text className="mt-6 text-center text-lg font-medium text-slate-200">
              {PHASE_LABELS[store.phase] ?? 'Preparing…'}
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              @{username}
            </Text>

            <View className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-slate-800">
              <View
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${store.progress}%` }}
              />
            </View>

            {store.phase === 'detecting' && (
              <Text className="mt-3 text-center text-xs text-slate-600">
                This may take a minute — analyzing positions at depth 12
              </Text>
            )}
          </>
        ) : (
          <>
            <Text className="text-center text-lg font-medium text-red-400">
              {store.error}
            </Text>
            <Text
              className="mt-4 text-center text-sm text-slate-400 underline"
              onPress={() => navigation.replace('Home')}
            >
              Go back and try again
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
