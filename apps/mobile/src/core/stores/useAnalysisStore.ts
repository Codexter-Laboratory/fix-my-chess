import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BlunderPuzzle, ChessComGame, OpeningStats } from '../../shared/types';

type AnalysisPhase =
  | 'idle'
  | 'fetching'
  | 'analyzing'
  | 'detecting'
  | 'complete'
  | 'error';

interface AnalysisState {
  // --- Persisted data ---
  username: string;
  games: readonly ChessComGame[];
  openingStats: readonly OpeningStats[];
  blunders: readonly BlunderPuzzle[];
  lastFetchedAt: number | null;

  // --- Transient (not persisted) ---
  phase: AnalysisPhase;
  progress: number;
  error: string | null;

  // --- Actions ---
  setPhase: (phase: AnalysisPhase) => void;
  setUsername: (username: string) => void;
  setGames: (games: readonly ChessComGame[]) => void;
  setOpeningStats: (stats: readonly OpeningStats[]) => void;
  setBlunders: (blunders: readonly BlunderPuzzle[]) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  markFetched: () => void;
  reset: () => void;
}

const TRANSIENT_STATE = {
  phase: 'idle' as AnalysisPhase,
  progress: 0,
  error: null as string | null,
};

const PERSISTED_STATE = {
  username: '',
  games: [] as readonly ChessComGame[],
  openingStats: [] as readonly OpeningStats[],
  blunders: [] as readonly BlunderPuzzle[],
  lastFetchedAt: null as number | null,
};

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      ...PERSISTED_STATE,
      ...TRANSIENT_STATE,
      setPhase: (phase) => set({ phase }),
      setUsername: (username) => set({ username }),
      setGames: (games) => set({ games }),
      setOpeningStats: (stats) => set({ openingStats: stats }),
      setBlunders: (blunders) => set({ blunders }),
      setProgress: (progress) => set({ progress }),
      setError: (error) => set({ error, phase: error ? 'error' : 'idle' }),
      markFetched: () => set({ lastFetchedAt: Date.now() }),
      reset: () => set({ ...PERSISTED_STATE, ...TRANSIENT_STATE }),
    }),
    {
      name: 'fix-my-chess-analysis',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        username: state.username,
        games: state.games,
        openingStats: state.openingStats,
        blunders: state.blunders,
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
