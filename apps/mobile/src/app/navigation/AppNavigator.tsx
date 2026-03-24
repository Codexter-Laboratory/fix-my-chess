import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import {
  useAnalysisStore,
  isCacheFresh,
} from '../../core/stores/useAnalysisStore';
import { HomeScreen } from '../../features/home/ui/HomeScreen';
import { LoadingScreen } from '../../features/home/ui/LoadingScreen';
import { DashboardScreen } from '../../features/dashboard/ui/DashboardScreen';
import { OpeningLeaksScreenNav } from '../../features/openings/ui/OpeningLeaksScreenNav';
import { OpeningDetailScreen } from '../../features/openings/ui/OpeningDetailScreen';
import { GameViewerScreen } from '../../features/openings/ui/GameViewerScreen';
import { PuzzleSessionScreen } from '../../features/puzzles/ui/PuzzleSessionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: '#020617' },
  animation: 'fade' as const,
};

const MODAL_OPTIONS = {
  ...SCREEN_OPTIONS,
  headerShown: true,
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#94a3b8',
  headerTitleStyle: { color: '#e2e8f0', fontSize: 16 },
};

export function AppNavigator(): React.ReactElement {
  const [hydrated, setHydrated] = useState(false);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>('Home');

  useEffect(() => {
    const unsub = useAnalysisStore.persist.onFinishHydration(() => {
      const state = useAnalysisStore.getState();
      if (
        isCacheFresh(state.lastFetchedAt) &&
        state.winLossStats.totalGames > 0 &&
        state.username.length > 0
      ) {
        state.setPhase('complete');
        setInitialRoute('Dashboard');
      }
      setHydrated(true);
    });

    if (useAnalysisStore.persist.hasHydrated()) {
      const state = useAnalysisStore.getState();
      if (
        isCacheFresh(state.lastFetchedAt) &&
        state.winLossStats.totalGames > 0 &&
        state.username.length > 0
      ) {
        state.setPhase('complete');
        setInitialRoute('Dashboard');
      }
      setHydrated(true);
    }

    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={SCREEN_OPTIONS}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen
          name="OpeningLeaks"
          component={OpeningLeaksScreenNav}
          options={{
            ...MODAL_OPTIONS,
            headerTitle: 'Opening Leaks',
          }}
        />
        <Stack.Screen
          name="OpeningDetail"
          component={OpeningDetailScreen}
          options={{
            ...MODAL_OPTIONS,
            headerTitle: 'Opening Detail',
          }}
        />
        <Stack.Screen
          name="GameViewer"
          component={GameViewerScreen}
          options={SCREEN_OPTIONS}
        />
        <Stack.Screen
          name="PuzzleSession"
          component={PuzzleSessionScreen}
          options={SCREEN_OPTIONS}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
