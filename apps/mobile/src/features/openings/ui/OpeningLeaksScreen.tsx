import React, { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import type { ChessComGame, OpeningStats } from '../../../shared/types';
import { calculateLeaks, getWorstOpenings } from '../logic/calculateLeaks';
import { LeakBar } from './LeakBar';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OpeningLeaksScreenProps {
  games: readonly ChessComGame[];
  username: string;
  onOpeningPress: (opening: OpeningStats) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_GAMES = 5;
const TOP_N = 5;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 200;

const CHART_CONFIG = {
  backgroundGradientFrom: '#0f172a',
  backgroundGradientTo: '#0f172a',
  fillShadowGradient: '#dc2626',
  fillShadowGradientOpacity: 0.9,
  fillShadowGradientFrom: '#dc2626',
  fillShadowGradientTo: '#991b1b',
  color: () => 'rgba(248, 113, 113, 0.8)',
  labelColor: () => 'rgba(148, 163, 184, 1)',
  barPercentage: 0.6,
  decimalPlaces: 0,
  propsForBackgroundLines: {
    stroke: '#1e293b',
    strokeWidth: 1,
  },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OpeningLeaksScreen({
  games,
  username,
  onOpeningPress,
}: OpeningLeaksScreenProps): React.ReactElement {
  const allStats = useMemo(() => calculateLeaks(games, username), [games, username]);

  const worstOpenings = useMemo(
    () => getWorstOpenings(allStats, MIN_GAMES, TOP_N),
    [allStats],
  );

  const chartData = useMemo(
    () => ({
      labels: worstOpenings.map((o) => truncateLabel(o.eco, 6)),
      datasets: [{ data: worstOpenings.map((o) => Math.round(o.lossRate)) }],
    }),
    [worstOpenings],
  );

  const totalGamesAnalyzed = allStats.reduce((sum, s) => sum + s.totalGames, 0);
  const totalOpenings = allStats.length;

  const [expandedEco, setExpandedEco] = useState<string | null>(null);

  const handleToggle = useCallback(
    (opening: OpeningStats) => {
      setExpandedEco((prev) => (prev === opening.eco ? null : opening.eco));
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: OpeningStats; index: number }) => (
      <OpeningLeakCard
        opening={item}
        rank={index + 1}
        isExpanded={expandedEco === item.eco}
        onPress={() => handleToggle(item)}
        onDetailPress={() => onOpeningPress(item)}
      />
    ),
    [expandedEco, handleToggle, onOpeningPress],
  );

  const keyExtractor = useCallback((item: OpeningStats) => item.eco + item.name, []);

  // ----- Empty state -----
  if (worstOpenings.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950" style={{ flex: 1, backgroundColor: '#020617' }}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg text-slate-400">
            Not enough data yet.{'\n'}Play at least {MIN_GAMES} games with the
            same opening to see leaks.
          </Text>
          <Text className="mt-2 text-center text-xs text-slate-600">
            {totalGamesAnalyzed} games across {totalOpenings} openings analyzed
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" style={{ flex: 1, backgroundColor: '#020617' }}>
      <FlatList
        data={worstOpenings}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerClassName="pb-8"
        ListHeaderComponent={
          <ListHeader
            totalGamesAnalyzed={totalGamesAnalyzed}
            totalOpenings={totalOpenings}
            chartData={chartData}
            worstOpenings={worstOpenings}
          />
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// List header (chart + summary)
// ---------------------------------------------------------------------------

interface ListHeaderProps {
  totalGamesAnalyzed: number;
  totalOpenings: number;
  chartData: { labels: string[]; datasets: { data: number[] }[] };
  worstOpenings: readonly OpeningStats[];
}

const ListHeader = React.memo(function ListHeader({
  totalGamesAnalyzed,
  totalOpenings,
  chartData,
  worstOpenings,
}: ListHeaderProps) {
  return (
    <View>
      {/* Title */}
      <View className="px-4 pb-1 pt-4">
        <Text className="text-xl font-semibold text-slate-100">
          Opening Leaks
        </Text>
        <Text className="mt-1 text-xs text-slate-500">
          Last 3 months · {totalGamesAnalyzed} games · {totalOpenings} openings
        </Text>
      </View>

      {/* Bar chart: loss rate % per opening */}
      <View className="mt-3 px-2">
        <Text className="mb-1 px-2 text-[10px] uppercase tracking-widest text-slate-600">
          Loss rate % (top 5 worst)
        </Text>
        {chartData.datasets[0].data.length > 0 && (
          <BarChart
            data={chartData}
            width={SCREEN_WIDTH - 16}
            height={CHART_HEIGHT}
            yAxisSuffix="%"
            yAxisLabel=""
            chartConfig={CHART_CONFIG}
            fromZero
            showValuesOnTopOfBars
            withInnerLines
            style={{ borderRadius: 8 }}
          />
        )}
      </View>

      {/* Custom animated breakdown bars */}
      <View className="mt-4 px-4">
        <Text className="mb-2 text-[10px] uppercase tracking-widest text-slate-600">
          Win / Loss breakdown
        </Text>
        {worstOpenings.map((o) => (
          <LeakBar
            key={o.eco + o.name}
            label={o.name}
            eco={o.eco}
            winRate={o.winRate}
            lossRate={o.lossRate}
            totalGames={o.totalGames}
          />
        ))}
      </View>

      {/* Section divider */}
      <View className="mx-4 mt-4 border-b border-slate-800 pb-2">
        <Text className="text-[10px] uppercase tracking-widest text-slate-600">
          Leaky openings detail
        </Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Opening leak card (tappable list item)
// ---------------------------------------------------------------------------

interface OpeningLeakCardProps {
  opening: OpeningStats;
  rank: number;
  isExpanded: boolean;
  onPress: () => void;
  onDetailPress: () => void;
}

const OpeningLeakCard = React.memo(function OpeningLeakCard({
  opening,
  rank,
  isExpanded,
  onPress,
  onDetailPress,
}: OpeningLeakCardProps) {
  const drawRate = 100 - opening.winRate - opening.lossRate;

  return (
    <TouchableOpacity
      className="mx-4 mt-3 rounded-lg border border-slate-800 bg-slate-900 p-3"
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Top row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <View className="h-6 w-6 items-center justify-center rounded bg-red-900/50">
            <Text className="font-mono text-xs font-bold text-red-400">
              {rank}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-200" numberOfLines={1}>
              {opening.name}
            </Text>
            <Text className="font-mono text-[10px] text-slate-500">
              {opening.eco} · {opening.totalGames} games
            </Text>
          </View>
        </View>
        <Text className="font-mono text-lg font-bold text-red-400">
          {opening.lossRate.toFixed(0)}%
        </Text>
      </View>

      {/* Expanded detail */}
      {isExpanded && (
        <View className="mt-3 border-t border-slate-800 pt-3">
          {/* W/L/D row */}
          <View className="flex-row justify-between">
            <StatPill label="W" value={opening.wins} color="text-emerald-400" />
            <StatPill label="L" value={opening.losses} color="text-red-400" />
            <StatPill label="D" value={opening.draws} color="text-slate-400" />
            <StatPill
              label="Win%"
              value={`${opening.winRate.toFixed(0)}%`}
              color="text-emerald-400"
            />
            <StatPill
              label="Draw%"
              value={`${drawRate.toFixed(0)}%`}
              color="text-slate-400"
            />
          </View>

          {/* Color split */}
          <View className="mt-2 flex-row justify-between">
            <View className="flex-1 pr-2">
              <Text className="mb-0.5 text-[9px] uppercase text-slate-600">
                As White
              </Text>
              <Text className="font-mono text-xs text-slate-300">
                +{opening.asWhite.wins} −{opening.asWhite.losses} ={opening.asWhite.draws}
              </Text>
            </View>
            <View className="flex-1 pl-2">
              <Text className="mb-0.5 text-[9px] uppercase text-slate-600">
                As Black
              </Text>
              <Text className="font-mono text-xs text-slate-300">
                +{opening.asBlack.wins} −{opening.asBlack.losses} ={opening.asBlack.draws}
              </Text>
            </View>
          </View>

          {/* View games link */}
          <TouchableOpacity
            className="mt-3 rounded bg-slate-800 py-2"
            onPress={onDetailPress}
          >
            <Text className="text-center text-xs font-medium text-slate-300">
              View {opening.lossGameUrls.length} lost game
              {opening.lossGameUrls.length !== 1 ? 's' : ''} →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Tiny sub-components
// ---------------------------------------------------------------------------

function StatPill({
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
      <Text className={`font-mono text-xs font-semibold ${color}`}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateLabel(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}
