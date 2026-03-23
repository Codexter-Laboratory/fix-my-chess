# Fix My Chess — Setup Guide

## Terminal Commands (Initialization)

```bash
# 1. Create Nx workspace with React Native
npx create-nx-workspace@latest fix-my-chess \
  --preset=react-native \
  --appName=mobile \
  --packageManager=npm \
  --nxCloud=skip

# 2. Install dependencies (run from workspace root)
cd fix-my-chess
npm install zustand nativewind react-native-reanimated react-native-safe-area-context react-native-worklets --legacy-peer-deps
npm install -D tailwindcss@^3.4.17 prettier-plugin-tailwindcss@^0.5.11 --legacy-peer-deps

# 3. iOS only: Install pods
npx nx run mobile:pod-install
```

## Development Commands

```bash
# Start Metro bundler
npx nx start mobile

# Run on iOS (Mac only)
npx nx run-ios mobile

# Run on Android
npx nx run-android mobile

# Lint
npx nx run mobile:lint

# Test
npx nx run mobile:test
```
