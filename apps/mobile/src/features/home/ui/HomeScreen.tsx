import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useUserStore } from '../../../core/stores/useUserStore';

export function HomeScreen(): React.ReactElement {
  const [inputValue, setInputValue] = useState('');
  const { setUsername, setLoading, isLoading } = useUserStore();

  const handleSubmit = useCallback(() => {
    setLoading(true);
    setUsername(inputValue.trim());
    setInputValue('');
    setLoading(false);
  }, [inputValue, setUsername, setLoading]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 items-center justify-center px-8">
        <Text
          className="mb-2 text-center font-mono text-2xl font-semibold tracking-tight text-slate-100"
          testID="heading"
        >
          Fix My Chess
        </Text>
        <Text className="mb-8 text-center text-sm text-slate-400">
          Chess analytics for serious players
        </Text>

        <View className="w-full max-w-sm">
          <TextInput
            className="mb-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-base text-slate-100 placeholder:text-slate-500"
            placeholder="Chess.com username"
            placeholderTextColor="#64748b"
            value={inputValue}
            onChangeText={setInputValue}
            editable={!isLoading}
            autoCapitalize="none"
            autoCorrect={false}
            testID="username-input"
          />
          <TouchableOpacity
            className="rounded-lg bg-slate-700 py-3 active:bg-slate-600"
            onPress={handleSubmit}
            disabled={isLoading || !inputValue.trim()}
            testID="submit-button"
          >
            <Text className="text-center font-medium text-slate-100">
              {isLoading ? 'Loading...' : 'Analyze'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
