/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';

jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  return {
    GestureHandlerRootView: RN.View,
    Swipeable: RN.View,
    DrawerLayout: RN.View,
    State: {},
    ScrollView: RN.ScrollView,
    PanGestureHandler: RN.View,
    TapGestureHandler: RN.View,
    FlatList: RN.FlatList,
    TouchableOpacity: RN.TouchableOpacity,
  };
});

jest.mock('react-native-screens', () => {
  const RN = require('react-native');
  return {
    enableScreens: jest.fn(),
    enableFreeze: jest.fn(),
    screensEnabled: jest.fn(() => true),
    Screen: RN.View,
    ScreenContainer: RN.View,
    ScreenStack: RN.View,
    ScreenStackHeaderConfig: RN.View,
    NativeScreen: RN.View,
    NativeScreenContainer: RN.View,
    NativeScreenNavigationContainer: RN.View,
  };
});

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const RN = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaConsumer: ({
      children,
    }: {
      children: (insets: typeof inset) => React.ReactNode;
    }) => children(inset),
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
    SafeAreaView: RN.View,
    SafeAreaInsetsContext: {
      Consumer: ({ children }: { children: (insets: typeof inset) => React.ReactNode }) =>
        children(inset),
    },
    initialWindowMetrics: { insets: inset, frame: { x: 0, y: 0, width: 390, height: 844 } },
  };
});

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (comp: React.ComponentType) => comp,
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      FlatList: RN.FlatList,
    },
    useSharedValue: (init: unknown) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useAnimatedProps: () => ({}),
    withTiming: (toValue: unknown) => toValue,
    withSpring: (toValue: unknown) => toValue,
    withSequence: (...values: unknown[]) => values[values.length - 1],
    withDelay: (_delay: unknown, anim: unknown) => anim,
    withRepeat: (anim: unknown) => anim,
    Easing: { linear: jest.fn(), ease: jest.fn(), bezier: jest.fn(() => jest.fn()) },
    createAnimatedComponent: (comp: React.ComponentType) => comp,
    View: RN.View,
    FadeIn: { duration: jest.fn().mockReturnThis() },
    FadeOut: { duration: jest.fn().mockReturnThis() },
    Layout: {},
  };
});

jest.mock('react-native-worklets', () => ({
  __esModule: true,
  Worklets: { defaultContext: {} },
}));

jest.mock('react-native-chart-kit', () => {
  const RN = require('react-native');
  return { BarChart: RN.View, LineChart: RN.View, PieChart: RN.View };
});

jest.mock('react-native-chessboardjs', () => {
  const RN = require('react-native');
  return { __esModule: true, default: RN.View };
});

jest.mock('react-native-webview', () => {
  const RN = require('react-native');
  return { WebView: RN.View };
});

jest.mock('../../global.css', () => undefined);
