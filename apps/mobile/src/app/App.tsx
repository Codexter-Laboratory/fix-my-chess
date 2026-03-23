import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './navigation/AppNavigator';

import '../../global.css';

export function App(): React.ReactElement {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#020617' }}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}

export default App;
