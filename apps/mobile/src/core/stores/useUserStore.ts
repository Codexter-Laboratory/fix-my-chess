import { create } from 'zustand';

interface UserState {
  username: string;
  isLoading: boolean;
  setUsername: (username: string) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  username: '',
  isLoading: false,
  setUsername: (username) => set({ username }),
  setLoading: (isLoading) => set({ isLoading }),
}));
