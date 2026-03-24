import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAnalysisStore } from '../../../core/stores/useAnalysisStore';
import type { OpeningDetailScreenProps } from '../../../app/navigation/types';
import type { ChessComGame } from '../../../shared/types';

interface LostGameEntry {
  url: string;
  game: ChessComGame | undefined;
  color: 'White' | 'Black';
  opponent: string;
}

export function OpeningDetailScreen({
  navigation,
  route,
}: OpeningDetailScreenProps): React.ReactElement {
  const { opening } = route.params;
  const { games, username } = useAnalysisStore();
  const drawRate = 100 - opening.winRate - opening.lossRate;

  const hasGameData = games.length > 0;

  const lostGames = useMemo((): LostGameEntry[] => {
    return opening.lossGameUrls.map((url) => {
      const game = games.find((g) => g.url === url);
      const isWhite =
        game?.white.username.toLowerCase() === username.toLowerCase();
      return {
        url,
        game,
        color: isWhite ? 'White' : 'Black',
        opponent: isWhite
          ? game?.black.username ?? 'Unknown'
          : game?.white.username ?? 'Unknown',
      };
    });
  }, [opening.lossGameUrls, games, username]);

  const handleReview = useCallback(
    (entry: LostGameEntry) => {
      navigation.navigate('GameViewer', { gameUrl: entry.url });
    },
    [navigation],
  );

  const renderGameItem = useCallback(
    ({ item, index }: { item: LostGameEntry; index: number }) => (
      <TouchableOpacity
        className="mx-4 mb-2 flex-row items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-4 py-3"
        onPress={() => hasGameData && handleReview(item)}
        activeOpacity={hasGameData ? 0.7 : 1}
        disabled={!hasGameData}
      >
        <View className="flex-1">
          <Text className="text-sm font-medium text-slate-200">
            Game {index + 1}
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Played as {item.color} vs {item.opponent}
          </Text>
        </View>
        {hasGameData && (
          <Text className="text-sm text-indigo-400">Review →</Text>
        )}
      </TouchableOpacity>
    ),
    [handleReview, hasGameData],
  );

  return (
    <SafeAreaView
      className="flex-1 bg-slate-950"
      style={{ flex: 1, backgroundColor: '#020617' }}
    >
      <FlatList
        data={lostGames}
        keyExtractor={(item, idx) => `${item.url}-${idx}`}
        renderItem={renderGameItem}
        contentContainerClassName="pb-8"
        ListHeaderComponent={
          <View className="px-4 pb-3 pt-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              {opening.eco}
            </Text>
            <Text className="mt-1 text-xl font-bold text-slate-100">
              {opening.name}
            </Text>

            <View className="mt-4 flex-row justify-between rounded-lg bg-slate-900 p-3">
              <MiniStat
                label="Games"
                value={opening.totalGames}
                color="text-slate-300"
              />
              <MiniStat
                label="Win%"
                value={`${opening.winRate.toFixed(0)}%`}
                color="text-emerald-400"
              />
              <MiniStat
                label="Loss%"
                value={`${opening.lossRate.toFixed(0)}%`}
                color="text-red-400"
              />
              <MiniStat
                label="Draw%"
                value={`${drawRate.toFixed(0)}%`}
                color="text-slate-400"
              />
            </View>

            <View className="mt-3 flex-row gap-3">
              <View className="flex-1 rounded-lg bg-slate-900 p-3">
                <Text className="text-[10px] uppercase tracking-wider text-slate-600">
                  As White
                </Text>
                <Text className="mt-1 font-mono text-sm text-slate-300">
                  +{opening.asWhite.wins} −{opening.asWhite.losses} =
                  {opening.asWhite.draws}
                </Text>
              </View>
              <View className="flex-1 rounded-lg bg-slate-900 p-3">
                <Text className="text-[10px] uppercase tracking-wider text-slate-600">
                  As Black
                </Text>
                <Text className="mt-1 font-mono text-sm text-slate-300">
                  +{opening.asBlack.wins} −{opening.asBlack.losses} =
                  {opening.asBlack.draws}
                </Text>
              </View>
            </View>

            <View className="mt-4 border-b border-slate-800 pb-2">
              <Text className="text-[10px] uppercase tracking-widest text-slate-600">
                Lost games ({opening.lossGameUrls.length})
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-8 py-12">
            <Text className="text-sm text-slate-500">
              No lost games found for this opening.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <View className="items-center">
      <Text className="text-[9px] uppercase text-slate-600">{label}</Text>
      <Text className={`font-mono text-sm font-semibold ${color}`}>
        {value}
      </Text>
    </View>
  );
}
