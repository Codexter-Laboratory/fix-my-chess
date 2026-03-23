import { create } from 'zustand';
import type { BlunderPuzzle } from '../../shared/types';

type PuzzleStatus = 'unsolved' | 'solved' | 'failed';

interface PuzzleEntry {
  puzzle: BlunderPuzzle;
  status: PuzzleStatus;
  attempts: number;
}

interface PuzzleState {
  entries: readonly PuzzleEntry[];
  currentIndex: number;
  lives: number;

  loadPuzzles: (puzzles: readonly BlunderPuzzle[]) => void;
  currentEntry: () => PuzzleEntry | null;
  markSolved: () => void;
  recordFailedAttempt: () => void;
  nextPuzzle: () => void;
  resetLives: () => void;
}

const MAX_LIVES = 3;

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
  entries: [],
  currentIndex: 0,
  lives: MAX_LIVES,

  loadPuzzles: (puzzles) =>
    set({
      entries: puzzles.map((puzzle) => ({ puzzle, status: 'unsolved', attempts: 0 })),
      currentIndex: 0,
      lives: MAX_LIVES,
    }),

  currentEntry: () => {
    const { entries, currentIndex } = get();
    return entries[currentIndex] ?? null;
  },

  markSolved: () =>
    set((state) => ({
      entries: state.entries.map((e, i) =>
        i === state.currentIndex ? { ...e, status: 'solved' } : e,
      ),
    })),

  recordFailedAttempt: () =>
    set((state) => {
      const updatedEntries = state.entries.map((e, i) =>
        i === state.currentIndex ? { ...e, attempts: e.attempts + 1 } : e,
      );
      const newLives = state.lives - 1;
      const failed = newLives <= 0;
      return {
        entries: failed
          ? updatedEntries.map((e, i) =>
              i === state.currentIndex ? { ...e, status: 'failed' } : e,
            )
          : updatedEntries,
        lives: Math.max(0, newLives),
      };
    }),

  nextPuzzle: () =>
    set((state) => ({
      currentIndex: Math.min(state.currentIndex + 1, state.entries.length - 1),
      lives: MAX_LIVES,
    })),

  resetLives: () => set({ lives: MAX_LIVES }),
}));
