import React, { useCallback } from 'react';
import { useAnalysisStore } from '../../../core/stores/useAnalysisStore';
import type { OpeningLeaksScreenProps } from '../../../app/navigation/types';
import type { OpeningStats } from '../../../shared/types';
import { OpeningLeaksScreen } from './OpeningLeaksScreen';

export function OpeningLeaksScreenNav({
  navigation,
}: OpeningLeaksScreenProps): React.ReactElement {
  const { games, username } = useAnalysisStore();

  const handleOpeningPress = useCallback(
    (opening: OpeningStats) => {
      navigation.navigate('OpeningDetail', { opening });
    },
    [navigation],
  );

  return (
    <OpeningLeaksScreen
      games={games}
      username={username}
      onOpeningPress={handleOpeningPress}
    />
  );
}
