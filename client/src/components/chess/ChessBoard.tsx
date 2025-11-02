import React, { useState, useEffect, useRef, MouseEvent } from 'react';
import { Chess, Color, Move, Square, PieceSymbol } from 'chess.js';
import ChessSquare from './ChessSquare';
import LegalMoveIndicator from './LegalMoveIndicator';
import LetterNotation from './LetterNotation';
import NumberNotation from './NumberNotation';
import { drawArrow } from '../../utils/chessCanvas';

interface ChessBoardProps {
  chess: Chess;
  board: ({ square: Square; type: PieceSymbol; color: Color } | null)[][];
  setBoard: React.Dispatch<React.SetStateAction<({ square: Square; type: PieceSymbol; color: Color } | null)[][]>>;
  isFlipped?: boolean;
  onMove?: (move: Move) => void;
  disabled?: boolean;
  averageRating?: number;
  boxSize?: number;
}

export const isPromoting = (chess: Chess, from: Square, to: Square): boolean => {
  if (!from) return false;

  const piece = chess.get(from);
  if (!piece || piece.type !== 'p') return false;
  if (piece.color !== chess.turn()) return false;
  if (!['1', '8'].some((it) => to.endsWith(it))) return false;

  const moves = chess.moves({ square: from, verbose: true });
  if (Array.isArray(moves) && moves.length > 0 && typeof moves[0] === 'object') {
    return (moves as Move[]).map((it: Move) => it.to).includes(to);
  }
  return false;
};

const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  board,
  setBoard,
  isFlipped = false,
  onMove,
  disabled = false,
  averageRating,
  boxSize: providedBoxSize,
}) => {
  const [from, setFrom] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [rightClickedSquares, setRightClickedSquares] = useState<string[]>([]);
  const [arrowStart, setArrowStart] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const moveHistoryRef = useRef<Move[]>([]);

  // Calculate box size based on rating or use provided size (default 75 for larger board)
  const boxSize = providedBoxSize || 75;
  const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  const isMyTurn = !disabled;

  // Update last move when board changes
  useEffect(() => {
    try {
      const history = chess.history({ verbose: true });
      if (Array.isArray(history) && history.length > 0 && typeof history[0] === 'object') {
        const moves = history as Move[];
        const last = moves[moves.length - 1];
        setLastMove({ from: last.from, to: last.to });
        moveHistoryRef.current = moves;
      } else {
        setLastMove(null);
        moveHistoryRef.current = [];
      }
    } catch (error) {
      console.error('Error updating move history:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const clearCanvas = () => {
    setRightClickedSquares([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const handleRightClick = (squareRep: string) => {
    if (rightClickedSquares.includes(squareRep)) {
      setRightClickedSquares((prev) => prev.filter((sq) => sq !== squareRep));
    } else {
      setRightClickedSquares((prev) => [...prev, squareRep]);
    }
  };

  const handleDrawArrow = (squareRep: string) => {
    if (arrowStart && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        drawArrow(ctx, arrowStart, squareRep, isFlipped, boxSize);
      }
      setArrowStart(null);
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, squareRep: string) => {
    e.preventDefault();
    if (e.button === 2) {
      setArrowStart(squareRep);
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>, squareRep: string) => {
    e.preventDefault();
    if (e.button === 2) {
      if (arrowStart === squareRep) {
        handleRightClick(squareRep);
      } else {
        handleDrawArrow(squareRep);
      }
    } else {
      clearCanvas();
    }
  };

  const handleSquareClick = (squareRep: Square) => {
    if (disabled || !isMyTurn) return;

    const square = board
      .flat()
      .find((sq) => sq?.square === squareRep);

      if (!from) {
        // First click - select piece
        if (square?.color === chess.turn()) {
          setFrom(squareRep);
          const moves = chess.moves({ square: squareRep, verbose: true });
          if (Array.isArray(moves) && moves.length > 0 && typeof moves[0] === 'object') {
            setLegalMoves((moves as Move[]).map((move: Move) => move.to));
          }
        }
      } else {
        // Second click - make move
        if (from === squareRep) {
          // Clicked same square - deselect
          setFrom(null);
          setLegalMoves([]);
        } else if (square?.color === chess.turn()) {
          // Clicked another piece of same color - select new piece
          setFrom(squareRep);
          const moves = chess.moves({ square: squareRep, verbose: true });
          if (Array.isArray(moves) && moves.length > 0 && typeof moves[0] === 'object') {
            setLegalMoves((moves as Move[]).map((move: Move) => move.to));
          }
        } else {
          // Try to make move
          try {
            let moveResult: Move | null = null;
            if (isPromoting(chess, from, squareRep)) {
              moveResult = chess.move({
                from,
                to: squareRep,
                promotion: 'q',
              });
            } else {
              moveResult = chess.move({
                from,
                to: squareRep,
              });
            }

            if (moveResult) {
              setBoard(chess.board());
              setFrom(null);
              setLegalMoves([]);
              if (onMove) {
                onMove(moveResult);
              }
            }
          } catch (error) {
            console.error('Invalid move:', error);
            // Invalid move - deselect
            setFrom(null);
            setLegalMoves([]);
          }
        }
      }
  };

  return (
    <div className="flex relative">
      <div className="text-white-200 rounded-md overflow-hidden">
        {(isFlipped ? board.slice().reverse() : board).map((row, i) => {
          const rowNum = isFlipped ? i + 1 : 8 - i;
          return (
            <div key={i} className="flex relative">
              <NumberNotation
                isMainBoxColor={isFlipped ? rowNum % 2 !== 0 : rowNum % 2 === 0}
                label={rowNum.toString()}
              />
              {(isFlipped ? row.slice().reverse() : row).map((square, j) => {
                const colNum = isFlipped ? 7 - (j % 8) : j % 8;
                const squareRepresentation = (String.fromCharCode(97 + colNum) + '' + rowNum) as Square;
                const isMainBoxColor = (rowNum + colNum) % 2 !== 0;
                const isPiece = !!square;
                const isHighlightedSquare =
                  from === squareRepresentation ||
                  squareRepresentation === lastMove?.from ||
                  squareRepresentation === lastMove?.to;
                const isRightClickedSquare = rightClickedSquares.includes(squareRepresentation);

                const piece = square?.type;
                const isKingInCheckSquare =
                  piece === 'k' && square?.color === chess.turn() && chess.inCheck();

                return (
                  <div
                    key={j}
                    onClick={() => handleSquareClick(squareRepresentation)}
                    style={{
                      width: boxSize,
                      height: boxSize,
                    }}
                    className={`${
                      isRightClickedSquare
                        ? isMainBoxColor
                          ? 'bg-[#CF664E]'
                          : 'bg-[#E87764]'
                        : isKingInCheckSquare
                        ? 'bg-[#FF6347]'
                        : isHighlightedSquare
                        ? isMainBoxColor
                          ? 'bg-[#BBCB45]'
                          : 'bg-[#F4F687]'
                        : isMainBoxColor
                        ? 'bg-[#b58863]'
                        : 'bg-[#f0d9b5]'
                    } cursor-pointer relative`}
                    onContextMenu={(e) => {
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      handleMouseDown(e, squareRepresentation);
                    }}
                    onMouseUp={(e) => {
                      handleMouseUp(e, squareRepresentation);
                    }}
                  >
                    <div className="w-full justify-center flex h-full relative">
                      {square && <ChessSquare square={square} boxSize={boxSize} />}
                      {isFlipped
                        ? rowNum === 8 && (
                            <LetterNotation
                              label={labels[colNum]}
                              isMainBoxColor={colNum % 2 === 0}
                            />
                          )
                        : rowNum === 1 && (
                            <LetterNotation
                              label={labels[colNum]}
                              isMainBoxColor={colNum % 2 !== 0}
                            />
                          )}
                      {!!from && legalMoves.includes(squareRepresentation) && (
                        <LegalMoveIndicator isMainBoxColor={isMainBoxColor} isPiece={isPiece} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <canvas
        ref={canvasRef}
        width={boxSize * 8}
        height={boxSize * 8}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onMouseUp={(e) => e.preventDefault()}
      />
    </div>
  );
};

export default ChessBoard;

