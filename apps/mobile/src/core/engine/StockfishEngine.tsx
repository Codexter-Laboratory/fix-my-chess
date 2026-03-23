import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { EngineEvaluation, EvalRequest } from '../../shared/types';

export interface StockfishEngineHandle {
  evaluate: (request: EvalRequest) => Promise<EngineEvaluation>;
  stop: () => void;
  isReady: () => boolean;
  waitUntilReady: () => Promise<void>;
  destroy?: () => void;
}

const STOCKFISH_CDN =
  'https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js';

const ENGINE_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script>
  var engine = null;

  function send(cmd) {
    if (engine) engine.postMessage(cmd);
  }

  function initEngine() {
    try {
      engine = new Worker('${STOCKFISH_CDN}');
      engine.onmessage = function(e) {
        window.ReactNativeWebView.postMessage(e.data);
      };
      engine.onerror = function(err) {
        window.ReactNativeWebView.postMessage('__ENGINE_ERROR__:' + err.message);
      };
      send('uci');
    } catch (err) {
      window.ReactNativeWebView.postMessage('__ENGINE_ERROR__:' + err.message);
    }
  }

  document.addEventListener('message', function(e) { send(e.data); });
  window.addEventListener('message', function(e) { send(e.data); });

  initEngine();
</script>
</body>
</html>
`;

const EVAL_TIMEOUT_MS = 30_000;
const READY_TIMEOUT_MS = 15_000;

interface PendingEval {
  fen: string;
  depth: number;
  bestMove: string;
  score: number;
  isMate: boolean;
  mateIn: number | null;
  currentDepth: number;
  resolve: (result: EngineEvaluation) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export const StockfishEngine = forwardRef<StockfishEngineHandle>(
  function StockfishEngine(_props, ref) {
    const webViewRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    const pendingRef = useRef<PendingEval | null>(null);
    const readyResolversRef = useRef<Array<() => void>>([]);
    const mountedRef = useRef(true);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (pendingRef.current) {
          clearTimeout(pendingRef.current.timer);
          pendingRef.current.reject(new Error('Engine unmounted'));
          pendingRef.current = null;
        }
        readyResolversRef.current.forEach((r) => r());
        readyResolversRef.current = [];
      };
    }, []);

    const sendUci = useCallback((cmd: string) => {
      webViewRef.current?.postMessage(cmd);
    }, []);

    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      const line = event.nativeEvent.data;

      if (line.startsWith('__ENGINE_ERROR__:')) {
        const errMsg = line.slice('__ENGINE_ERROR__:'.length);
        if (pendingRef.current) {
          clearTimeout(pendingRef.current.timer);
          pendingRef.current.reject(new Error(`Engine error: ${errMsg}`));
          pendingRef.current = null;
        }
        return;
      }

      if (line === 'uciok') {
        sendUci('isready');
        return;
      }

      if (line === 'readyok') {
        readyRef.current = true;
        const resolvers = readyResolversRef.current.splice(0);
        resolvers.forEach((r) => r());
        return;
      }

      const pending = pendingRef.current;
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
        pendingRef.current = null;
      }
    }, [sendUci]);

    const evaluate = useCallback(
      (request: EvalRequest): Promise<EngineEvaluation> => {
        if (!mountedRef.current) {
          return Promise.reject(new Error('Engine not mounted'));
        }

        if (pendingRef.current) {
          clearTimeout(pendingRef.current.timer);
          sendUci('stop');
          pendingRef.current.reject(new Error('Evaluation interrupted'));
          pendingRef.current = null;
        }

        return new Promise<EngineEvaluation>((resolve, reject) => {
          const timer = setTimeout(() => {
            sendUci('stop');
            if (pendingRef.current) {
              pendingRef.current.reject(
                new Error(`Evaluation timed out after ${EVAL_TIMEOUT_MS}ms`),
              );
              pendingRef.current = null;
            }
          }, EVAL_TIMEOUT_MS);

          pendingRef.current = {
            fen: request.fen,
            depth: request.depth,
            bestMove: '',
            score: 0,
            isMate: false,
            mateIn: null,
            currentDepth: 0,
            resolve,
            reject,
            timer,
          };

          sendUci('ucinewgame');
          sendUci(`position fen ${request.fen}`);
          sendUci(`go depth ${request.depth}`);
        });
      },
      [sendUci],
    );

    const stop = useCallback(() => {
      sendUci('stop');
      if (pendingRef.current) {
        clearTimeout(pendingRef.current.timer);
        pendingRef.current.reject(new Error('Stopped by caller'));
        pendingRef.current = null;
      }
    }, [sendUci]);

    const isReady = useCallback(() => readyRef.current, []);

    const waitUntilReady = useCallback((): Promise<void> => {
      if (readyRef.current) return Promise.resolve();

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Engine not ready after ${READY_TIMEOUT_MS}ms`));
        }, READY_TIMEOUT_MS);

        readyResolversRef.current.push(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }, []);

    useImperativeHandle(ref, () => ({ evaluate, stop, isReady, waitUntilReady }), [
      evaluate,
      stop,
      isReady,
      waitUntilReady,
    ]);

    return (
      <View style={{ height: 0, width: 0, position: 'absolute', overflow: 'hidden' }}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: ENGINE_HTML }}
          javaScriptEnabled
          onMessage={handleMessage}
        />
      </View>
    );
  },
);

function parseInfoLine(line: string, pending: PendingEval): void {
  const depthMatch = line.match(/\bdepth (\d+)/);
  if (depthMatch) {
    pending.currentDepth = Number(depthMatch[1]);
  }

  const cpMatch = line.match(/\bscore cp (-?\d+)/);
  if (cpMatch) {
    pending.score = Number(cpMatch[1]);
    pending.isMate = false;
    pending.mateIn = null;
    return;
  }

  const mateMatch = line.match(/\bscore mate (-?\d+)/);
  if (mateMatch) {
    const mateIn = Number(mateMatch[1]);
    pending.isMate = true;
    pending.mateIn = mateIn;
    pending.score = mateIn > 0 ? 10_000 : -10_000;
  }
}
