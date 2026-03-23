import type { EngineEvaluation, EvalRequest } from '../../shared/types';
import type { StockfishEngineHandle } from './StockfishEngine';

const STOCKFISH_CDN =
  'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';

const EVAL_TIMEOUT_MS = 30_000;
const READY_TIMEOUT_MS = 15_000;

interface PendingEval {
  fen: string;
  bestMove: string;
  score: number;
  isMate: boolean;
  mateIn: number | null;
  currentDepth: number;
  resolve: (result: EngineEvaluation) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Creates a Stockfish engine backed by a Web Worker.
 * Works only in browser environments — no React component needed.
 *
 * Uses a Blob + importScripts wrapper because browsers enforce same-origin
 * policy on `new Worker(url)` — cross-origin CDN URLs are rejected.
 * Classic workers CAN use `importScripts()` for cross-origin scripts.
 */
export function createWebStockfish(): StockfishEngineHandle {
  let worker: Worker | null = null;
  let ready = false;
  let pending: PendingEval | null = null;
  let destroyed = false;
  const readyResolvers: Array<() => void> = [];

  try {
    const blob = new Blob(
      [`importScripts('${STOCKFISH_CDN}');`],
      { type: 'text/javascript' },
    );
    const blobUrl = URL.createObjectURL(blob);
    worker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Worker creation can fail in some environments
  }

  function send(cmd: string) {
    worker?.postMessage(cmd);
  }

  if (worker) {
    worker.onmessage = (e: MessageEvent<string>) => {
      const line = String(e.data);

      if (line === 'uciok') {
        send('isready');
        return;
      }

      if (line === 'readyok') {
        ready = true;
        const resolvers = readyResolvers.splice(0);
        resolvers.forEach((r) => r());
        return;
      }

      if (!pending) return;

      if (line.startsWith('info') && line.includes(' score ')) {
        parseInfoLine(line, pending);
      }

      if (line.startsWith('bestmove')) {
        clearTimeout(pending.timer);
        const bestMove = line.split(' ')[1] ?? '';
        pending.bestMove = bestMove;

        const result: EngineEvaluation = {
          fen: pending.fen,
          score: pending.score,
          bestMove: pending.bestMove,
          depth: pending.currentDepth,
          isMate: pending.isMate,
          mateIn: pending.mateIn,
        };

        pending.resolve(result);
        pending = null;
      }
    };

    worker.onerror = () => {
      if (pending) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Worker error'));
        pending = null;
      }
    };

    send('uci');
  }

  const evaluate = (request: EvalRequest): Promise<EngineEvaluation> => {
    if (destroyed || !worker) {
      return Promise.reject(new Error('Engine not available'));
    }

    if (pending) {
      clearTimeout(pending.timer);
      send('stop');
      pending.reject(new Error('Evaluation interrupted'));
      pending = null;
    }

    return new Promise<EngineEvaluation>((resolve, reject) => {
      const timer = setTimeout(() => {
        send('stop');
        if (pending) {
          pending.reject(new Error(`Evaluation timed out after ${EVAL_TIMEOUT_MS}ms`));
          pending = null;
        }
      }, EVAL_TIMEOUT_MS);

      pending = {
        fen: request.fen,
        bestMove: '',
        score: 0,
        isMate: false,
        mateIn: null,
        currentDepth: 0,
        resolve,
        reject,
        timer,
      };

      send('ucinewgame');
      send(`position fen ${request.fen}`);
      send(`go depth ${request.depth}`);
    });
  };

  const stop = () => {
    send('stop');
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Stopped by caller'));
      pending = null;
    }
  };

  const isReady = () => ready;

  const waitUntilReady = (): Promise<void> => {
    if (ready) return Promise.resolve();
    if (!worker) return Promise.reject(new Error('No worker available'));

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Engine not ready after ${READY_TIMEOUT_MS}ms`));
      }, READY_TIMEOUT_MS);

      readyResolvers.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  const destroy = () => {
    destroyed = true;
    stop();
    worker?.terminate();
    worker = null;
    const resolvers = readyResolvers.splice(0);
    resolvers.forEach((r) => r());
  };

  return { evaluate, stop, isReady, waitUntilReady, destroy };
}

function parseInfoLine(line: string, p: PendingEval): void {
  const depthMatch = line.match(/\bdepth (\d+)/);
  if (depthMatch) {
    p.currentDepth = Number(depthMatch[1]);
  }

  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  if (cpMatch) {
    p.score = Number(cpMatch[1]);
    p.isMate = false;
    p.mateIn = null;
    return;
  }

  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  if (mateMatch) {
    const mateIn = Number(mateMatch[1]);
    p.isMate = true;
    p.mateIn = mateIn;
    p.score = mateIn > 0 ? 10_000 : -10_000;
  }
}
