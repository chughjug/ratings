import React, { useState, useEffect } from 'react';
import { Chess, Move } from 'chess.js';
import ChessBoard from '../components/chess/ChessBoard';
import { RotateCcw, FlipHorizontal, Square } from 'lucide-react';

const PlayChess: React.FC = () => {
  const [chess] = useState(() => {
    try {
      return new Chess();
    } catch (error) {
      console.error('Error creating Chess:', error);
      throw error;
    }
  });
  
  const [board, setBoard] = useState(() => {
    try {
      const b = chess.board();
      console.log('Initial board:', b);
      return b;
    } catch (error) {
      console.error('Error getting board:', error);
      return [];
    }
  });
  
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [gameStatus, setGameStatus] = useState<{
    isGameOver: boolean;
    result: string | null;
    inCheck: boolean;
  }>({
    isGameOver: false,
    result: null,
    inCheck: false,
  });

  const updateGameStatus = () => {
    try {
      const isGameOver = chess.isGameOver();
      const inCheck = chess.inCheck();
      let result: string | null = null;

      if (isGameOver) {
        if (chess.isCheckmate()) {
          result = chess.turn() === 'w' ? 'Black wins by checkmate!' : 'White wins by checkmate!';
        } else if (chess.isDraw()) {
          if (chess.isStalemate()) {
            result = 'Draw by stalemate!';
          } else if (chess.isThreefoldRepetition()) {
            result = 'Draw by threefold repetition!';
          } else if (chess.isInsufficientMaterial()) {
            result = 'Draw by insufficient material!';
          } else {
            result = 'Draw!';
          }
        }
      }

      setGameStatus({ isGameOver, result, inCheck });
      const newBoard = chess.board();
      setBoard(newBoard);
    } catch (error) {
      console.error('Error updating game status:', error);
    }
  };

  useEffect(() => {
    updateGameStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveHistory]);

  const handleMove = (move: Move) => {
    try {
      setMoveHistory((prev) => [...prev, move]);
      updateGameStatus();
    } catch (error) {
      console.error('Error handling move:', error);
    }
  };

  const handleReset = () => {
    try {
      chess.reset();
      setMoveHistory([]);
      const newBoard = chess.board();
      setBoard(newBoard);
      updateGameStatus();
    } catch (error) {
      console.error('Error resetting game:', error);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0) return;
    
    try {
      chess.undo();
      setMoveHistory((prev) => prev.slice(0, -1));
      updateGameStatus();
    } catch (error) {
      console.error('Error undoing move:', error);
    }
  };

  const getMoveNotation = (move: Move, index: number) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhite = index % 2 === 0;
    return isWhite ? `${moveNumber}. ${move.san}` : move.san;
  };

  // Safety check
  if (!board || board.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Loading Chess Game...</h1>
            <p className="text-gray-700">Initializing board...</p>
          </div>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Chess Board Section */}
              <div className="flex flex-col items-center">
                {/* Game Status */}
                <div className="mb-4 w-full">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {gameStatus.isGameOver ? 'Game Over' : chess.turn() === 'w' ? "White's Turn" : "Black's Turn"}
                    </h2>
                    {gameStatus.inCheck && !gameStatus.isGameOver && (
                      <span className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold">
                        Check!
                      </span>
                    )}
                  </div>
                  {gameStatus.result && (
                    <div className="px-4 py-3 bg-yellow-100 border border-yellow-400 rounded-lg mb-4">
                      <p className="text-lg font-semibold text-yellow-800">{gameStatus.result}</p>
                    </div>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    title="Reset Game"
                  >
                    <Square className="w-4 h-4" />
                    New Game
                  </button>
                  <button
                    onClick={handleUndo}
                    disabled={moveHistory.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo Move"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Undo
                  </button>
                  <button
                    onClick={handleFlip}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    title="Flip Board"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                    Flip
                  </button>
                </div>

                {/* Chess Board */}
                <div className="p-4 bg-gray-800 rounded-lg shadow-xl">
                  <ChessBoard
                    chess={chess}
                    board={board}
                    setBoard={setBoard}
                    isFlipped={isFlipped}
                    onMove={handleMove}
                    disabled={gameStatus.isGameOver}
                  />
                </div>
              </div>

              {/* Move History Section */}
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-4 h-full">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Move History</h3>
                  <div className="bg-white rounded-lg p-4 max-h-[600px] overflow-y-auto">
                    {moveHistory.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No moves yet. Start playing!</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {moveHistory.map((move, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <span className="font-mono text-sm">
                              {getMoveNotation(move, index)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Game Info */}
                  <div className="mt-4 space-y-2">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">
                        <strong>Moves:</strong> {moveHistory.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Render error:', error);
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Chess Game</h1>
            <p className="text-gray-700 mb-4">Error: {(error as Error).message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default PlayChess;
