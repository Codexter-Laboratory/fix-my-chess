# FixMyChess

FixMyChess is a React Native chess training app. You enter a [Chess.com](https://www.chess.com) username, pull recent games from the public API, and get **opening statistics**, **win/loss summaries**, and **blunder detection** powered by Stockfish. Detected mistakes become a **Daily Blunder Deck** of puzzles (find the best move), with optional **full-game review** at the blunder position.

This repository is an [Nx](https://nx.dev) monorepo. The main application is `@fix-my-chess/mobile`.

## Features

- **Profile check** — Validates the player exists and has recent games before analysis.
- **Recent games** — Pulls archived games (default window: last three months) with rate-limit aware fetching.
- **Opening leaks** — Aggregates results by opening (ECO / name) to surface weak lines.
- **Engine blunder analysis** — Stockfish evaluation over your moves to find serious mistakes.
- **Puzzle session** — Replay positions from your own games; review the full game jumped to the blunder ply when needed.
- **Local cache** — Insights persist per day (Zustand + platform storage) so you are not forced to re-fetch every launch.

FixMyChess is not affiliated with Chess.com. It uses their [published public API](https://www.chess.com/news/view/published-data-api) only.

## Tech stack

| Area | Technology |
|------|------------|
| Monorepo / tasks | Nx |
| App | React Native (iOS, Android), React Native Web via Vite for web development |
| Navigation | React Navigation (native stack) |
| State | Zustand (persisted) |
| Chess | chess.js, Stockfish (in-app engine), react-native-chessboard (native) |
| Styling | NativeWind (Tailwind for RN) |
| E2E | Playwright (`@fix-my-chess/mobile-e2e`) |

## Requirements

- **Node.js** (LTS recommended) and npm
- For **iOS**: Xcode and CocoaPods (`pod install` in `apps/mobile/ios` when needed)
- For **Android**: Android SDK / Android Studio and a device or emulator
- For **web**: no extra setup beyond `npm install`

## Getting started

From the repository root:

```sh
npm install
```

### iOS (first time)

```sh
npx nx run-ios mobile
```

If CocoaPods dependencies are missing:

```sh
npx nx pod-install mobile
```

## Development commands

Use Nx from the workspace root. The mobile app project name is **`@fix-my-chess/mobile`** (short name **`mobile`** works in most commands).

| Command | Description |
|---------|-------------|
| `npx nx dev mobile` | Web dev server (Vite + React Native Web) |
| `npx nx start mobile` | Metro bundler for native |
| `npx nx run-ios mobile` | Build and run on iOS simulator / device |
| `npx nx run-android mobile` | Build and run on Android emulator / device |
| `npx nx build mobile` | Production web build (`dist/apps/mobile/web`) |
| `npx nx preview mobile` | Preview the production web build locally |
| `npx nx lint mobile` | ESLint |
| `npx nx test mobile` | Jest unit tests |
| `npx nx typecheck mobile` | TypeScript project references / declarations |
| `npx nx graph` | Interactive project dependency graph |

List all targets for the app:

```sh
npx nx show project mobile
```

### End-to-end tests

Playwright tests live in `apps/mobile-e2e`. They depend on the mobile web preview build:

```sh
npx nx e2e @fix-my-chess/mobile-e2e
```

## Repository layout

```
apps/
  mobile/          # React Native app (source under src/)
  mobile-e2e/      # Playwright E2E
```

Shared application code is organized under `apps/mobile/src` (features, core API, engine, navigation, stores).

## License

MIT (see `package.json`).
