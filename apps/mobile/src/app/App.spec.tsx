import React from 'react';
import { render } from '@testing-library/react-native';
import { HomeScreen } from '../features/home/ui/HomeScreen';

const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  reset: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
  setParams: jest.fn(),
};

const mockRoute = {
  key: 'Home',
  name: 'Home' as const,
  params: undefined,
};

test('HomeScreen renders app title and input', () => {
  const { getByTestId } = render(
    <HomeScreen navigation={mockNavigation as never} route={mockRoute as never} />,
  );
  expect(getByTestId('heading')).toHaveTextContent(/Fix My Chess/);
  expect(getByTestId('username-input')).toBeTruthy();
  expect(getByTestId('submit-button')).toBeTruthy();
});
