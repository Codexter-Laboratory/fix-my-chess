import React from 'react';
import { StatusBar } from 'react-native';
import { HomeScreen } from '../features/home/ui/HomeScreen';

import '../global.css';

export function App(): React.ReactElement {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <HomeScreen />
    </>
  );
}

export default App;
