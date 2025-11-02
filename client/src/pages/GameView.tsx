import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Chess, Move } from 'chess.js';
import ChessBoard from '../components/chess/ChessBoard';
import { Clock } from 'lucide-react';
import axios from 'axios';
import ErrorBoundary from '../components/ErrorBoundary';

interface ClockTimes {
  white: number;
  black: number;
}

const GameView: React.FC = () => {
  const { gameId, color, token } = useParams<{ gameId: string; color: string; token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [chess] = useState(() => new Chess());
  
  const [board, setBoard] = useState(() => chess.board());
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
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
  const [clockTimes, setClockTimes] = useState<ClockTimes>({
    white: 10 * 60 * 1000,
    black: 10 * 60 * 1000,
  });
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [activeColor, setActiveColor] = useState<'white' | 'black'>('white');
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [incrementSeconds, setIncrementSeconds] = useState(0);
  const playerColor = color || 'white';

  // Load game data
  useEffect(() => {
    const loadGame = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.NODE_ENV === 'production'
          ? '/api/games'
          : 'http://localhost:5000/api/games';
        
        const response = await axios.get(`${apiUrl}/access/${gameId}/${color}/${token}`);
        
        if (response.data.success) {
          const game = response.data.game;
          
          // Set initial times from game data
          if (game.timeControlSettings) {
            const initialTime = game.timeControlSettings.initialTimeMs || 10 * 60 * 1000;
            setIncrementSeconds(game.timeControlSettings.incrementSeconds || 0);
            setClockTimes({
              white: game.white_time_ms || initialTime,
              black: game.black_time_ms || initialTime,
            });
          } else {
            const initialTime = game.initial_time_ms || 10 * 60 * 1000;
            setClockTimes({
              white: game.white_time_ms || initialTime,
              black: game.black_time_ms || initialTime,
            });
          }
          
          // Load PGN if exists
          if (game.pgn) {
            chess.loadPgn(game.pgn);
            setBoard(chess.board());
            const history = chess.history({ verbose: true });
            if (Array.isArray(history)) {
              setMoveHistory(history as Move[]);
            }
          }
        }
      } catch (error: any) {
        console.error('Error loading game:', error);
        setError(error.response?.data?.error || 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    if (gameId && color && token) {
      loadGame();
    }
  }, [gameId, color, token, chess]);

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
      setBoard(chess.board());
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

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getMoveNotation = (move: Move, index: number) => {
    const moveNumber = Math.floor(index / 2) + 1;
    const isWhite = index % 2 === 0;
    return isWhite ? `${moveNumber}. ${move.san}` : move.san;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Loading Game...</h1>
            <p className="text-gray-600">Please wait while we load your game.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Game</h1>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <ErrorBoundary>
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
                  <div className="px-4 py-2 bg-blue-100 border border-blue-400 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800">
                      You are playing as: <span className="uppercase">{playerColor}</span>
                    </p>
                  </div>
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
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setIsClockRunning(!isClockRunning)}
                        disabled={gameStatus.isGameOver}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={isClockRunning ? "Pause Clock" : "Start Clock"}
                      >
                        <Clock className="w-4 h-4" />
                        {isClockRunning ? 'Pause' : 'Start'}
                      </button>
                    </div>
                    <div className="flex-1 text-center">
                      <div className={`text-2xl font-mono font-bold ${activeColor === 'black' && isClockRunning ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                        {formatTime(clockTimes.black)}
                      </div>
                      <div className="text-sm text-gray-300 mt-1">Black</div>
                    </div>
                  </div>
                </div>

                {/* Chess Board */}
                <div className="p-4 bg-gray-800 rounded-lg shadow-xl">
                  <ChessBoard
                    chess={chess}
                    board={board}
                    setBoard={setBoard}
                    isFlipped={playerColor === 'black'}
                    onMove={handleMove}
                    disabled={gameStatus.isGameOver || chess.turn() !== (playerColor === 'white' ? 'w' : 'b')}
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
    </ErrorBoundary>
  );
};

export default GameView;

