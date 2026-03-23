import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BlunderPuzzle, OpeningStats, PlayerColor } from '../../shared/types';

export type RootStackParamList = {
  Home: undefined;
  Loading: { username: string };
  Dashboard: undefined;
  OpeningLeaks: undefined;
  PuzzleSession: undefined;
  PuzzleSolver: {
    puzzle: BlunderPuzzle;
    playerColor: PlayerColor;
    index: number;
    total: number;
  };
  OpeningDetail: { opening: OpeningStats };
  GameViewer: { gameUrl: string };
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type LoadingScreenProps = NativeStackScreenProps<RootStackParamList, 'Loading'>;
export type DashboardScreenProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;
export type OpeningLeaksScreenProps = NativeStackScreenProps<RootStackParamList, 'OpeningLeaks'>;
export type PuzzleSessionScreenProps = NativeStackScreenProps<RootStackParamList, 'PuzzleSession'>;
export type PuzzleSolverScreenProps = NativeStackScreenProps<RootStackParamList, 'PuzzleSolver'>;
export type OpeningDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'OpeningDetail'>;
export type GameViewerScreenProps = NativeStackScreenProps<RootStackParamList, 'GameViewer'>;
