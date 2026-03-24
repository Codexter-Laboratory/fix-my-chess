import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  fetchPlayerProfile,
  hasRecentGames,
} from '../../../core/api/chessCom';
import type { HomeScreenProps } from '../../../app/navigation/types';

type EmptyState = 'not-found' | 'no-recent-games' | null;

const DEMO_USERNAME = 'hikaru';

export function HomeScreen({
  navigation,
}: HomeScreenProps): React.ReactElement {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emptyState, setEmptyState] = useState<EmptyState>(null);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputValue(text);
      if (emptyState) setEmptyState(null);
    },
    [emptyState],
  );

  const navigateToAnalysis = useCallback(
    (username: string) => {
      navigation.navigate('Loading', { username });
    },
    [navigation],
  );

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    Keyboard.dismiss();
    setIsLoading(true);
    setEmptyState(null);

    try {
      await fetchPlayerProfile(trimmed);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 404) {
        setEmptyState('not-found');
      } else {
        setEmptyState('not-found');
      }
      setIsLoading(false);
      return;
    }

    try {
      const hasGames = await hasRecentGames(trimmed, 3);
      if (!hasGames) {
        setEmptyState('no-recent-games');
        setIsLoading(false);
        return;
      }
    } catch {
      // If archive check fails, proceed anyway — LoadingScreen handles it
    }

    setIsLoading(false);
    navigateToAnalysis(trimmed);
  }, [inputValue, isLoading, navigateToAnalysis]);

  const handleLoadDemo = useCallback(() => {
    setEmptyState(null);
    setInputValue(DEMO_USERNAME);
    navigateToAnalysis(DEMO_USERNAME);
  }, [navigateToAnalysis]);

  const canSubmit = inputValue.trim().length > 0 && !isLoading;

  return (
    <SafeAreaView
      className="flex-1 bg-slate-900"
      style={{ flex: 1, backgroundColor: '#0f172a' }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center px-6 py-10">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
              <Text className="text-3xl">♟</Text>
            </View>

            <Text
              className="mb-2 text-center text-4xl font-extrabold text-white"
              testID="heading"
            >
              Fix My Chess
            </Text>

            <Text className="mb-10 text-center text-base text-slate-400">
              Turn your blunders into your best weapon.
            </Text>

            {/* Input */}
            <TextInput
              className={`mb-1 w-5/6 rounded-xl border p-4 text-base text-white ${
                emptyState === 'not-found'
                  ? 'border-red-500/60 bg-red-950/20'
                  : 'border-slate-700 bg-slate-800'
              }`}
              placeholder="Enter Chess.com Username"
              placeholderTextColor="#64748b"
              value={inputValue}
              onChangeText={handleTextChange}
              editable={!isLoading}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              testID="username-input"
            />

            {/* Inline error: not found */}
            {emptyState === 'not-found' && (
              <Text className="mb-2 w-5/6 text-center text-sm text-red-400">
                Username not found. Check your spelling.
              </Text>
            )}

            {!emptyState && <View className="mb-3" />}

            {/* CTA Button */}
            <TouchableOpacity
              className={`w-5/6 items-center rounded-xl p-4 ${
                canSubmit
                  ? 'bg-indigo-600 active:bg-indigo-700'
                  : 'bg-slate-700'
              }`}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
              testID="submit-button"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="text-base font-bold text-white">
                  Analyze My Games
                </Text>
              )}
            </TouchableOpacity>

            {/* No recent games — demo card */}
            {emptyState === 'no-recent-games' && (
              <View className="mt-6 w-5/6 overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-950/30">
                <View className="h-1 bg-amber-500" />
                <View className="p-5">
                  <Text className="text-base font-bold text-white">
                    No recent games found.
                  </Text>
                  <Text className="mt-2 text-sm leading-5 text-slate-400">
                    Play a match on Chess.com to generate your blunder deck, or
                    see how the app works using a Grandmaster's games.
                  </Text>

                  <TouchableOpacity
                    className="mt-4 items-center rounded-xl bg-amber-600 py-3 active:bg-amber-700"
                    onPress={handleLoadDemo}
                    activeOpacity={0.8}
                  >
                    <Text className="text-base font-bold text-white">
                      Load Demo (Hikaru)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Footer hint — only when no empty state */}
            {!emptyState && (
              <Text className="mt-8 text-center text-xs text-slate-600">
                We fetch your public games from Chess.com{'\n'}and find where
                you leak rating points.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
