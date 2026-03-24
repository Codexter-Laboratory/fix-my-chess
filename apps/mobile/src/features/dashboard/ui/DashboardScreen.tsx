import React, { useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAnalysisStore } from '../../../core/stores/useAnalysisStore';
import { getWorstOpenings } from '../../openings/logic/calculateLeaks';
import type { DashboardScreenProps } from '../../../app/navigation/types';

export function DashboardScreen({
  navigation,
}: DashboardScreenProps): React.ReactElement {
  const { username, openingStats, blunders, winLossStats, lastFetchedAt } =
    useAnalysisStore();

  const { totalGames, wins, losses, draws } = winLossStats;
  const totalOpenings = openingStats.length;
  const blunderCount = blunders.length;
  const worstOpenings = useMemo(
    () => getWorstOpenings(openingStats, 5, 5),
    [openingStats],
  );

  const winRate =
    totalGames > 0 ? ((wins / totalGames) * 100).toFixed(0) : '0';

  return (
    <SafeAreaView
      className="flex-1 bg-slate-950"
      style={{ flex: 1, backgroundColor: '#020617' }}
    >
      <ScrollView
        contentContainerClassName="pb-10"
        style={{ backgroundColor: '#020617' }}
      >
        {/* Header */}
        <View className="px-5 pb-2 pt-5">
          <Text className="text-2xl font-bold text-slate-100">
            @{username}
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            Last 3 months · {totalGames} games
            {lastFetchedAt
              ? ` · updated ${new Date(lastFetchedAt).toLocaleDateString()}`
              : ''}
          </Text>
        </View>

        {/* Stat cards row */}
        <View className="mt-4 flex-row justify-between px-5">
          <StatCard
            label="Wins"
            value={String(wins)}
            color="text-emerald-400"
          />
          <StatCard
            label="Losses"
            value={String(losses)}
            color="text-red-400"
          />
          <StatCard
            label="Draws"
            value={String(draws)}
            color="text-slate-400"
          />
          <StatCard
            label="Win %"
            value={`${winRate}%`}
            color="text-emerald-400"
          />
        </View>

        {/* DAILY BLUNDER DECK — primary CTA */}
        <TouchableOpacity
          className={`mx-5 mt-6 overflow-hidden rounded-2xl border ${
            blunderCount > 0
              ? 'border-indigo-500/30 bg-indigo-950'
              : 'border-slate-700 bg-slate-900'
          }`}
          onPress={() => {
            if (blunderCount > 0) navigation.navigate('PuzzleSession');
          }}
          activeOpacity={blunderCount > 0 ? 0.85 : 1}
          disabled={blunderCount === 0}
        >
          <View
            className={`h-1 ${blunderCount > 0 ? 'bg-indigo-500' : 'bg-slate-700'}`}
          />

          <View className="p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">
                  Daily Blunder Deck
                </Text>
                <Text
                  className={`mt-1 text-sm ${
                    blunderCount > 0 ? 'text-indigo-300' : 'text-slate-500'
                  }`}
                >
                  {blunderCount > 0
                    ? `We found ${blunderCount} critical mistake${blunderCount !== 1 ? 's' : ''} in your recent games.`
                    : 'No blunders detected — nice play!'}
                </Text>
              </View>
              <View
                className={`ml-3 h-12 w-12 items-center justify-center rounded-xl ${
                  blunderCount > 0 ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <Text className="text-2xl">♟</Text>
              </View>
            </View>

            {blunderCount > 0 && (
              <TouchableOpacity
                className="mt-4 items-center rounded-xl bg-indigo-600 py-3 active:bg-indigo-700"
                onPress={() => navigation.navigate('PuzzleSession')}
                activeOpacity={0.8}
              >
                <Text className="text-base font-bold text-white">
                  Solve My Blunders
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* Opening Leaks card */}
        <TouchableOpacity
          className="mx-5 mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
          onPress={() => navigation.navigate('OpeningLeaks')}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-100">
                Opening Leaks
              </Text>
              <Text className="mt-1 text-xs text-slate-500">
                {totalOpenings} openings analyzed ·{' '}
                {worstOpenings.length > 0
                  ? `worst: ${worstOpenings[0].name} (${worstOpenings[0].lossRate.toFixed(0)}% loss)`
                  : 'not enough data yet'}
              </Text>
            </View>
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-red-900/40">
              <Text className="text-lg text-red-400">📊</Text>
            </View>
          </View>

          {worstOpenings.length > 0 && (
            <View className="mt-3 border-t border-slate-800 pt-3">
              {worstOpenings.slice(0, 3).map((o, i) => (
                <View
                  key={o.eco + o.name}
                  className="mt-1 flex-row items-center justify-between"
                >
                  <Text
                    className="text-xs text-slate-400"
                    numberOfLines={1}
                  >
                    {i + 1}. {o.name}
                  </Text>
                  <Text className="font-mono text-xs text-red-400">
                    {o.lossRate.toFixed(0)}% L
                  </Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* New analysis */}
        <TouchableOpacity
          className="mx-5 mt-4 rounded-xl border border-slate-800 bg-slate-900 p-4"
          onPress={() => {
            useAnalysisStore.getState().reset();
            navigation.replace('Home');
          }}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-100">
                New Analysis
              </Text>
              <Text className="mt-1 text-xs text-slate-500">
                Analyze a different player or month
              </Text>
            </View>
            <View className="h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
              <Text className="text-lg text-slate-400">🔄</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="mx-1 flex-1 items-center rounded-lg bg-slate-900 py-3">
      <Text className={`font-mono text-xl font-bold ${color}`}>{value}</Text>
      <Text className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-600">
        {label}
      </Text>
    </View>
  );
}
