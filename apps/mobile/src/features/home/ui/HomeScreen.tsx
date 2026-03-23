import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { HomeScreenProps } from '../../../app/navigation/types';

export function HomeScreen({ navigation }: HomeScreenProps): React.ReactElement {
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || submitting) return;

    Keyboard.dismiss();
    setSubmitting(true);
    navigation.navigate('Loading', { username: trimmed });

    setTimeout(() => setSubmitting(false), 1000);
  }, [inputValue, submitting, navigation]);

  const canSubmit = inputValue.trim().length > 0 && !submitting;

  return (
    <SafeAreaView className="flex-1 bg-slate-900" style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 items-center justify-center px-6">
          {/* Icon */}
          <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600">
            <Text className="text-3xl">♟</Text>
          </View>

          {/* Title */}
          <Text
            className="mb-2 text-center text-4xl font-extrabold text-white"
            testID="heading"
          >
            Fix My Chess
          </Text>

          {/* Subtitle */}
          <Text className="mb-10 text-center text-base text-slate-400">
            Turn your blunders into your best weapon.
          </Text>

          {/* Input */}
          <TextInput
            className="mb-4 w-5/6 rounded-xl border border-slate-700 bg-slate-800 p-4 text-base text-white"
            placeholder="Enter Chess.com Username"
            placeholderTextColor="#64748b"
            value={inputValue}
            onChangeText={setInputValue}
            editable={!submitting}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            testID="username-input"
          />

          {/* CTA Button */}
          <TouchableOpacity
            className={`w-5/6 items-center rounded-xl p-4 ${
              canSubmit ? 'bg-indigo-600 active:bg-indigo-700' : 'bg-slate-700'
            }`}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.8}
            testID="submit-button"
          >
            <Text className="text-base font-bold text-white">
              {submitting ? 'Analyzing...' : 'Analyze My Games'}
            </Text>
          </TouchableOpacity>

          {/* Footer hint */}
          <Text className="mt-8 text-center text-xs text-slate-600">
            We fetch your public games from Chess.com{'\n'}and find where you
            leak rating points.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
