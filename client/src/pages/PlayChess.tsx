import React, { useState, useEffect, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import ChessBoard from '../components/chess/ChessBoard';
import { RotateCcw, FlipHorizontal, Square, Clock, Save } from 'lucide-react';
import axios from 'axios';

interface ClockTimes {
  white: number; // in milliseconds
  black: number; // in milliseconds
}

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
  
  // Clock state
  const initialTime = 10 * 60 * 1000; // 10 minutes in milliseconds
  const [clockTimes, setClockTimes] = useState<ClockTimes>({
    white: initialTime,
    black: initialTime,
  });
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [activeColor, setActiveColor] = useState<'white' | 'black'>('white');
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [incrementSeconds, setIncrementSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

  // Clock effect
  useEffect(() => {
    if (isClockRunning && !gameStatus.isGameOver) {
      clockIntervalRef.current = setInterval(() => {
        setClockTimes((prev) => {
          const newTimes = { ...prev };
          if (activeColor === 'white') {
            newTimes.white = Math.max(0, prev.white - 100);
          } else {
            newTimes.black = Math.max(0, prev.black - 100);
          }
          
          // Check if time ran out
          if (newTimes[activeColor] === 0) {
            setIsClockRunning(false);
            setGameStatus({
              isGameOver: true,
              result: activeColor === 'white' ? 'Black wins on time!' : 'White wins on time!',
              inCheck: false,
            });
          }
          
          return newTimes;
        });
      }, 100);

      return () => {
        if (clockIntervalRef.current) {
          clearInterval(clockIntervalRef.current);
        }
      };
    } else {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    }
  }, [isClockRunning, gameStatus.isGameOver, activeColor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    updateGameStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveHistory]);

  const handleMove = (move: Move) => {
    try {
      setMoveHistory((prev) => [...prev, move]);
      // Switch active color for clock
      setActiveColor(move.color === 'w' ? 'black' : 'white');
      
      // Add increment to the player who just moved
      if (incrementSeconds > 0) {
        setClockTimes((prev) => ({
          ...prev,
          [move.color === 'w' ? 'white' : 'black']: prev[move.color === 'w' ? 'white' : 'black'] + incrementSeconds * 1000
        }));
      }
      
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
      setClockTimes({ white: initialTime, black: initialTime });
      setActiveColor('white');
      setIsClockRunning(false);
      updateGameStatus();
    } catch (error) {
      console.error('Error resetting game:', error);
    }
  };
  
  const handleStartClock = () => {
    setIsClockRunning(true);
  };
  
  const handlePauseClock = () => {
    setIsClockRunning(false);
  };
  
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleSaveGame = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const pgn = chess.pgn();
      const result = gameStatus.result || null;
      
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? '/api/games'
        : 'http://localhost:5000/api/games';
      
      await axios.post(apiUrl, {
        whitePlayer: 'White',
        blackPlayer: 'Black',
        pgn,
        result,
        whiteTimeMs: clockTimes.white,
        blackTimeMs: clockTimes.black,
        initialTimeMs: initialTime,
        moveCount: moveHistory.length
      });
      
      setSaveMessage('Game saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving game:', error);
      setSaveMessage('Failed to save game');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
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

                {/* Chess Clocks */}
                <div className="w-full mb-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 text-center">
                      <div className={`text-2xl font-mono font-bold ${activeColor === 'white' && isClockRunning ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                        {formatTime(clockTimes.white)}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">White</div>
                    </div>
                    <div className="flex flex-col gap-2 items-center">
                      <button
                        onClick={isClockRunning ? handlePauseClock : handleStartClock}
                        disabled={gameStatus.isGameOver}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isClockRunning ? "Pause Clock" : "Start Clock"}
                      >
                        <Clock className="w-4 h-4" />
                        {isClockRunning ? 'Pause' : 'Start'}
                      </button>
                      {incrementSeconds > 0 && (
                        <span className="text-xs text-gray-300">+{incrementSeconds}s</span>
                      )}
                    </div>
                    <div className="flex-1 text-center">
                      <div className={`text-2xl font-mono font-bold ${activeColor === 'black' && isClockRunning ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                        {formatTime(clockTimes.black)}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">Black</div>
                    </div>
                  </div>
                </div>
                
                {/* Time Control Settings */}
                {!isClockRunning && moveHistory.length === 0 && (
                  <div className="w-full mb-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time Control
                    </label>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Initial Time (minutes)</label>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={Math.floor(initialTime / 60000)}
                          onChange={(e) => {
                            const newTime = Number(e.target.value) * 60 * 1000;
                            setClockTimes({ white: newTime, black: newTime });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          disabled={isClockRunning || moveHistory.length > 0}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Increment (seconds)</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={incrementSeconds}
                          onChange={(e) => setIncrementSeconds(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          disabled={isClockRunning || moveHistory.length > 0}
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                  <button
                    onClick={handleSaveGame}
                    disabled={isSaving || moveHistory.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save Game"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                
                {/* Save Message */}
                {saveMessage && (
                  <div className={`mt-2 px-4 py-2 rounded-lg text-center font-semibold ${
                    saveMessage.includes('successfully') 
                      ? 'bg-green-100 text-green-800 border border-green-400' 
                      : 'bg-red-100 text-red-800 border border-red-400'
                  }`}>
                    {saveMessage}
                  </div>
                )}

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
