import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const COLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const ROWS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

const PIECE_MAP: Record<string, string> = {
  K: '\u2654', Q: '\u2655', R: '\u2656', B: '\u2657', N: '\u2658', P: '\u2659',
  k: '\u265A', q: '\u265B', r: '\u265C', b: '\u265D', n: '\u265E', p: '\u265F',
};

const LIGHT = '#94a3b8';
const DARK = '#334155';
const HIGHLIGHT = 'rgba(79, 70, 229, 0.45)';
const SELECTED = 'rgba(250, 204, 21, 0.5)';
const LEGAL_DOT = 'rgba(0, 0, 0, 0.25)';
const LAST_MOVE = 'rgba(168, 85, 247, 0.35)';

interface ChessBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  highlightSquares?: string[];
  lastMoveSquares?: string[];
  selectedSquare?: string | null;
  legalMoveSquares?: string[];
  interactive?: boolean;
  onSquarePress?: (square: string) => void;
  size?: number;
}

function parseFen(fen: string): Record<string, string> {
  const board: Record<string, string> = {};
  const ranks = fen.split(' ')[0].split('/');

  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of ranks[r]) {
      if (ch >= '1' && ch <= '8') {
        col += parseInt(ch, 10);
      } else {
        const square = `${COLS[col]}${8 - r}`;
        board[square] = ch;
        col++;
      }
    }
  }
  return board;
}

export const ChessBoard = React.memo(function ChessBoard({
  fen,
  orientation = 'white',
  highlightSquares = [],
  lastMoveSquares = [],
  selectedSquare = null,
  legalMoveSquares = [],
  interactive = false,
  onSquarePress,
  size = 360,
}: ChessBoardProps) {
  const board = useMemo(() => parseFen(fen), [fen]);
  const highlightSet = useMemo(() => new Set(highlightSquares), [highlightSquares]);
  const lastMoveSet = useMemo(() => new Set(lastMoveSquares), [lastMoveSquares]);
  const legalMoveSet = useMemo(() => new Set(legalMoveSquares), [legalMoveSquares]);
  const cellSize = size / 8;

  const rows = orientation === 'white' ? ROWS : [...ROWS].reverse();
  const cols = orientation === 'white' ? COLS : [...COLS].reverse();

  return (
    <View style={{ width: size, height: size, borderRadius: 6, overflow: 'hidden' }}>
      {rows.map((rank, rowIdx) => (
        <View key={rank} style={{ flexDirection: 'row', height: cellSize }}>
          {cols.map((file, colIdx) => {
            const square = `${file}${rank}`;
            const isLight = (rowIdx + colIdx) % 2 === 0;
            const piece = board[square];
            const isSelected = selectedSquare === square;
            const isHighlighted = highlightSet.has(square);
            const isLastMove = lastMoveSet.has(square);
            const isLegalTarget = legalMoveSet.has(square);
            const hasPiece = Boolean(piece);

            let bgColor = isLight ? LIGHT : DARK;
            if (isSelected) bgColor = SELECTED;
            else if (isHighlighted) bgColor = HIGHLIGHT;
            else if (isLastMove) bgColor = LAST_MOVE;

            const cell = (
              <View
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {piece && (
                  <Text
                    style={{
                      fontSize: cellSize * 0.7,
                      lineHeight: cellSize * 0.85,
                      textAlign: 'center',
                    }}
                    selectable={false}
                  >
                    {PIECE_MAP[piece] ?? ''}
                  </Text>
                )}

                {isLegalTarget && !hasPiece && (
                  <View
                    style={{
                      width: cellSize * 0.3,
                      height: cellSize * 0.3,
                      borderRadius: cellSize * 0.15,
                      backgroundColor: LEGAL_DOT,
                    }}
                  />
                )}

                {isLegalTarget && hasPiece && (
                  <View
                    style={{
                      position: 'absolute',
                      width: cellSize,
                      height: cellSize,
                      borderRadius: cellSize * 0.5,
                      borderWidth: cellSize * 0.08,
                      borderColor: LEGAL_DOT,
                    }}
                  />
                )}

                {colIdx === 0 && (
                  <Text
                    style={{
                      position: 'absolute',
                      top: 1,
                      left: 2,
                      fontSize: 8,
                      color: isLight ? DARK : LIGHT,
                      opacity: 0.6,
                    }}
                    selectable={false}
                  >
                    {rank}
                  </Text>
                )}
                {rowIdx === 7 && (
                  <Text
                    style={{
                      position: 'absolute',
                      bottom: 1,
                      right: 2,
                      fontSize: 8,
                      color: isLight ? DARK : LIGHT,
                      opacity: 0.6,
                    }}
                    selectable={false}
                  >
                    {file}
                  </Text>
                )}
              </View>
            );

            if (interactive && onSquarePress) {
              return (
                <TouchableOpacity
                  key={square}
                  activeOpacity={0.8}
                  onPress={() => onSquarePress(square)}
                >
                  {cell}
                </TouchableOpacity>
              );
            }

            return <React.Fragment key={square}>{cell}</React.Fragment>;
          })}
        </View>
      ))}
    </View>
  );
});
