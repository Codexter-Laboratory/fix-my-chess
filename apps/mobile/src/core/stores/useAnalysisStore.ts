import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BlunderPuzzle, ChessComGame, OpeningStats } from '../../shared/types';
import { createPlatformStorage } from './storage';

type AnalysisPhase =
  | 'idle'
  | 'fetching'
  | 'analyzing'
  | 'detecting'
  | 'complete'
  | 'error';

export interface WinLossStats {
  readonly totalGames: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
}

interface AnalysisState {
  // --- Persisted (lightweight insights only) ---
  username: string;
  openingStats: readonly OpeningStats[];
  blunders: readonly BlunderPuzzle[];
  winLossStats: WinLossStats;
  lastFetchedAt: number | null;

  // --- In-memory only (never persisted) ---
  games: readonly ChessComGame[];
  phase: AnalysisPhase;
  progress: number;
  error: string | null;

  // --- Actions ---
  setPhase: (phase: AnalysisPhase) => void;
  setUsername: (username: string) => void;
  setGames: (games: readonly ChessComGame[]) => void;
  setOpeningStats: (stats: readonly OpeningStats[]) => void;
  setBlunders: (blunders: readonly BlunderPuzzle[]) => void;
  setWinLossStats: (stats: WinLossStats) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  markFetched: () => void;
  reset: () => void;
}

const EMPTY_STATS: WinLossStats = { totalGames: 0, wins: 0, losses: 0, draws: 0 };

const PERSISTED_DEFAULTS = {
  username: '',
  openingStats: [] as readonly OpeningStats[],
  blunders: [] as readonly BlunderPuzzle[],
  winLossStats: EMPTY_STATS,
  lastFetchedAt: null as number | null,
};

const TRANSIENT_DEFAULTS = {
  games: [] as readonly ChessComGame[],
  phase: 'idle' as AnalysisPhase,
  progress: 0,
  error: null as string | null,
};

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      ...PERSISTED_DEFAULTS,
      ...TRANSIENT_DEFAULTS,
      setPhase: (phase) => set({ phase }),
      setUsername: (username) => set({ username }),
      setGames: (games) => set({ games }),
      setOpeningStats: (stats) => set({ openingStats: stats }),
      setBlunders: (blunders) => set({ blunders }),
      setWinLossStats: (stats) => set({ winLossStats: stats }),
      setProgress: (progress) => set({ progress }),
      setError: (error) => set({ error, phase: error ? 'error' : 'idle' }),
      markFetched: () => set({ lastFetchedAt: Date.now() }),
      reset: () => set({ ...PERSISTED_DEFAULTS, ...TRANSIENT_DEFAULTS }),
    }),
    {
      name: 'fix-my-chess-analysis',
      storage: createJSONStorage(() => createPlatformStorage()),
      partialize: (state) => ({
        username: state.username,
        openingStats: state.openingStats,
        blunders: state.blunders,
        winLossStats: state.winLossStats,
        lastFetchedAt: state.lastFetchedAt,
      }),
    },
  ),
);

/**
 * Returns true if the cache was populated today (same calendar day).
 */
export function isCacheFresh(lastFetchedAt: number | null): boolean {
  if (!lastFetchedAt) return false;
  const now = new Date();
  const cached = new Date(lastFetchedAt);
  return (
    now.getFullYear() === cached.getFullYear() &&
    now.getMonth() === cached.getMonth() &&
    now.getDate() === cached.getDate()
  );
}
