/**
 * Strict interfaces for data passing between API, parser, and engine layers.
 * Every cross-boundary call uses one of these — no raw objects, no `any`.
 */

// ---------------------------------------------------------------------------
// Chess.com API response shapes
// ---------------------------------------------------------------------------

export interface ChessComPlayer {
  readonly username: string;
  readonly rating: number;
  readonly result: string;
  readonly '@id': string;
}

export interface ChessComGame {
  readonly url: string;
  readonly pgn: string;
  readonly fen: string;
  readonly white: ChessComPlayer;
  readonly black: ChessComPlayer;
  readonly end_time: number;
  readonly time_control: string;
  readonly rules: string;
  readonly accuracies?: {
    readonly white: number;
    readonly black: number;
  };
}

export interface ChessComArchiveResponse {
  readonly games: readonly ChessComGame[];
}

// ---------------------------------------------------------------------------
// Parsed game (output of PGN parser, input to engine)
// ---------------------------------------------------------------------------

export type PlayerColor = 'white' | 'black';

export interface ParsedMove {
  readonly moveNumber: number;
  readonly san: string;
  readonly fen: string;
  readonly color: PlayerColor;
}

export interface ParsedGame {
  readonly gameId: string;
  readonly playerColor: PlayerColor;
  readonly moves: readonly ParsedMove[];
}

// ---------------------------------------------------------------------------
// Engine evaluation
// ---------------------------------------------------------------------------

export interface EngineEvaluation {
  readonly fen: string;
  readonly score: number;
  readonly bestMove: string;
  readonly depth: number;
  readonly isMate: boolean;
  readonly mateIn: number | null;
}

export interface EvalRequest {
  readonly fen: string;
  readonly depth: number;
}

// ---------------------------------------------------------------------------
// Blunder detection output
// ---------------------------------------------------------------------------

export interface BlunderPuzzle {
  readonly gameId: string;
  readonly moveNumber: number;
  readonly fenBeforeBlunder: string;
  readonly fenAfterBlunder: string;
  readonly badMove: string;
  readonly bestMove: string;
  readonly bestMoveSan: string;
  readonly evalBefore: number;
  readonly evalAfter: number;
  readonly evalDrop: number;
  readonly playerColor: PlayerColor;
}

export interface BlunderDetectorResult {
  readonly blunders: readonly BlunderPuzzle[];
  readonly isAnalyzing: boolean;
  readonly progress: number;
  readonly error: string | null;
}

// ---------------------------------------------------------------------------
// Opening analytics
// ---------------------------------------------------------------------------

export type GameResult = 'win' | 'loss' | 'draw';

export interface OpeningRecord {
  readonly eco: string;
  readonly name: string;
  readonly gamesAsWhite: readonly GameOutcome[];
  readonly gamesAsBlack: readonly GameOutcome[];
}

export interface GameOutcome {
  readonly result: GameResult;
  readonly gameUrl: string;
  readonly opponentUsername: string;
  readonly opponentRating: number;
}

export interface OpeningStats {
  readonly eco: string;
  readonly name: string;
  readonly totalGames: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly winRate: number;
  readonly lossRate: number;
  readonly asWhite: { wins: number; losses: number; draws: number };
  readonly asBlack: { wins: number; losses: number; draws: number };
  readonly gameUrls: readonly string[];
  readonly lossGameUrls: readonly string[];
}

// ---------------------------------------------------------------------------
// API client error
// ---------------------------------------------------------------------------

export interface ApiError {
  readonly status: number;
  readonly message: string;
  readonly retryAfterMs: number | null;
}
