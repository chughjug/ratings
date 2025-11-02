declare module 'chess.js' {
  export type Color = 'w' | 'b';
  export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  export type Square = 
    | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6' | 'a7' | 'a8'
    | 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'b7' | 'b8'
    | 'c1' | 'c2' | 'c3' | 'c4' | 'c5' | 'c6' | 'c7' | 'c8'
    | 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8'
    | 'e1' | 'e2' | 'e3' | 'e4' | 'e5' | 'e6' | 'e7' | 'e8'
    | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8'
    | 'g1' | 'g2' | 'g3' | 'g4' | 'g5' | 'g6' | 'g7' | 'g8'
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'h7' | 'h8';

  export interface Move {
    color: Color;
    from: Square;
    to: Square;
    piece: PieceSymbol;
    captured?: PieceSymbol;
    promotion?: PieceSymbol;
    san: string;
    before: string;
    after: string;
  }

  export interface Piece {
    type: PieceSymbol;
    color: Color;
  }

  export class Chess {
    constructor(fen?: string);
    reset(): void;
    load(fen: string): void;
    fen(): string;
    pgn(options?: { newline?: string; maxWidth?: number }): string;
    board(): ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
    moves(options?: { square?: Square; verbose?: boolean }): Move[] | string[];
    move(move: { from: Square; to: Square; promotion?: PieceSymbol } | string): Move | null;
    undo(): Move | null;
    get(square: Square): Piece | null;
    turn(): Color;
    inCheck(): boolean;
    inCheckmate(): boolean;
    inStalemate(): boolean;
    inDraw(): boolean;
    isDraw(): boolean;
    isCheckmate(): boolean;
    isStalemate(): boolean;
    isGameOver(): boolean;
    isThreefoldRepetition(): boolean;
    isInsufficientMaterial(): boolean;
    history(options?: { verbose?: boolean }): Move[] | string[];
  }

  const ChessConstructor: typeof Chess;
  export default ChessConstructor;
}
