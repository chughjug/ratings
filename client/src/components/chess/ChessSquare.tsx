import React, { useState } from 'react';
import { Color, PieceSymbol, Square } from 'chess.js';

interface ChessSquareProps {
  square: {
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null;
  boxSize?: number;
}

// Unicode chess pieces as fallback
const pieceUnicode: Record<string, { white: string; black: string }> = {
  p: { white: '♙', black: '♟' },
  r: { white: '♖', black: '♜' },
  n: { white: '♘', black: '♞' },
  b: { white: '♗', black: '♝' },
  q: { white: '♕', black: '♛' },
  k: { white: '♔', black: '♚' },
};

const ChessSquare: React.FC<ChessSquareProps> = ({ square, boxSize = 75 }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!square) return null;

  // Try to use image first, fallback to Unicode
  const pieceKey = `${square.color}${square.type}`;
  const imagePath = `/${pieceKey}.png`;
  const unicodePiece = pieceUnicode[square.type]?.[square.color === 'w' ? 'white' : 'black'] || '';
  
  // Calculate piece size based on box size (roughly 75-80% of box)
  const pieceSize = Math.round(boxSize * 0.8);
  
  return (
    <div className="h-full justify-center flex flex-col items-center">
      <div className="relative">
        {!imageError ? (
          <img
            src={imagePath}
            alt={`${square.color} ${square.type}`}
            style={{ width: `${pieceSize}px`, height: `${pieceSize}px` }}
            className="object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <span style={{ fontSize: `${pieceSize}px` }}>{unicodePiece}</span>
        )}
      </div>
    </div>
  );
};

export default ChessSquare;

