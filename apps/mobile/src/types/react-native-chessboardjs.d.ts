declare module 'react-native-chessboardjs' {
  import type { ComponentType } from 'react';
  import type { ViewStyle, StyleProp } from 'react-native';

  interface ChessboardProps {
    position?: string;
    boardOrientation?: 'white' | 'black';
    onPieceDrop?: (
      sourceSquare: string,
      targetSquare: string,
      piece: string,
    ) => boolean;
    isDraggablePiece?: (args: { piece: string }) => boolean;
    customDarkSquareStyle?: ViewStyle;
    customLightSquareStyle?: ViewStyle;
    customSquareStyles?: Record<string, ViewStyle>;
    arePremovesAllowed?: boolean;
    boardWidth?: number;
    style?: StyleProp<ViewStyle>;
  }

  const Chessboard: ComponentType<ChessboardProps>;
  export default Chessboard;
}
