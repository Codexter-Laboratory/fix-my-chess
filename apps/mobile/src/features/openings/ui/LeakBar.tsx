import React from 'react';
import { Text, View } from 'react-native';

interface LeakBarProps {
  label: string;
  eco: string;
  winRate: number;
  lossRate: number;
  totalGames: number;
}

export const LeakBar = React.memo(function LeakBar({
  label,
  eco,
  winRate,
  lossRate,
  totalGames,
}: LeakBarProps) {
  return (
    <View className="mb-3">
      {/* Label row */}
      <View className="mb-1 flex-row items-baseline justify-between">
        <View className="flex-1 flex-row items-baseline gap-1.5">
          <Text className="font-mono text-[10px] text-slate-500">{eco}</Text>
          <Text className="text-xs text-slate-300" numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text className="ml-2 font-mono text-[10px] text-slate-500">
          {totalGames}g
        </Text>
      </View>

      {/* Stacked bar track */}
      <View className="h-5 flex-row overflow-hidden rounded-sm bg-slate-800">
        <View
          style={{ width: `${Math.round(lossRate)}%` }}
          className="h-full bg-red-700"
        />
        <View
          style={{ width: `${Math.round(winRate)}%` }}
          className="h-full bg-emerald-700"
        />
      </View>

      {/* Percent labels */}
      <View className="mt-0.5 flex-row justify-between">
        <Text className="font-mono text-[10px] text-red-400">
          {lossRate.toFixed(0)}% L
        </Text>
        <Text className="font-mono text-[10px] text-emerald-400">
          {winRate.toFixed(0)}% W
        </Text>
      </View>
    </View>
  );
});
