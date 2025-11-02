import React, { useState, useEffect, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import ChessBoard from '../components/chess/ChessBoard';
import { RotateCcw, FlipHorizontal, Square, Clock, Save, Copy, Check, Users } from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

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

  // Socket.io state
  const [socket, setSocket] = useState<any>(null);
  const [playerName, setPlayerName] = useState('');
  const [gameRoomId, setGameRoomId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [showRoomCreation, setShowRoomCreation] = useState(true);
  const [joinGameRoomCode, setJoinGameRoomCode] = useState('');
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  
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
  const [initialTimeMinutes, setInitialTimeMinutes] = useState(10);

  // Initialize Socket.io connection
  useEffect(() => {
    const socketUrl = process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:5000';
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });

    newSocket.on('newroom', (roomCode) => {
      console.log('Received room code:', roomCode);
      setGameRoomId(roomCode);
      setIsCreating(false);
      setWaitingForOpponent(true);
      setShowRoomCreation(false);
    });

    newSocket.on('username', (username: string) => {
      console.log('Received username:', username);
      // Player 1 receives this after creating a room
    });

    newSocket.on('username2', (name: string, opponent: string, room: string, rematch: boolean, rejoin: boolean, moveObj?: any, moveCount?: string) => {
      console.log('Both players present!', name, opponent, room, 'rematch:', rematch, 'rejoin:', rejoin);
      setWaitingForOpponent(false);
      setOpponentName(opponent);
      setShowRoomCreation(false);
      // Determine player color based on which user they are
      if (name === playerName) {
        setPlayerColor(rejoin ? 'black' : 'white');
      } else {
        setPlayerColor(rejoin ? 'white' : 'black');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle incoming moves from socket
  useEffect(() => {
    if (!socket) return;

    const handleSocketMove = (piece: string, pos: string, color: string, simulation: boolean, atk: boolean, server: boolean, move: string, pawnPromote: string) => {
      if (server) {
        // This is a move from the opponent
        // pos is the source square, move is the destination square
        try {
          // Create move notation from source and destination
          const moveNotation = `${pos}${move}`;
          const moveResult = chess.move(moveNotation);
          if (moveResult) {
            setMoveHistory((prev) => [...prev, moveResult]);
            setActiveColor(moveResult.color === 'w' ? 'black' : 'white');
            updateGameStatus();
          }
        } catch (error) {
          console.error('Error applying opponent move:', error);
        }
      }
    };

    socket.on('move', handleSocketMove);

    return () => {
      socket.off('move', handleSocketMove);
    };
  }, [socket, chess]);

  const handleStartGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!socket) {
      alert('Not connected to server. Please wait...');
      return;
    }

    console.log('Starting game for player:', playerName);
    socket.emit('newroom', playerName);
    socket.emit('game-options', '10', false, true, false);
  };

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!joinGameRoomCode.trim()) {
      alert('Please enter a room code');
      return;
    }

    setIsCreating(true);
    socket.emit('validate', joinGameRoomCode.toUpperCase());
    
    socket.once('validate', (isValid: boolean) => {
      if (isValid) {
        socket.emit('join', joinGameRoomCode.toUpperCase(), playerName, false, 0);
        setIsCreating(false);
      } else {
        alert('Invalid room code');
        setIsCreating(false);
      }
    });
  };

  const handleCopyRoomCode = () => {
    if (gameRoomId) {
      const link = `${window.location.origin}/play-chess`;
      navigator.clipboard.writeText(link);
      setCopiedLink('room');
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

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
      
      // Send move to opponent via socket (move.to is the destination square)
      if (socket && gameRoomId) {
        socket.emit('move', move.piece, move.from, move.color, false, false, true, move.to, '');
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
        whitePlayer: playerColor === 'white' ? playerName : opponentName,
        blackPlayer: playerColor === 'black' ? playerName : opponentName,
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

  const formatTimeControl = (minutes: number, increment: number) => {
    if (increment > 0) {
      return `${minutes}+${increment}`;
    }
    return `${minutes}`;
  };

  // Show room creation UI if not in a game
  if (showRoomCreation) {
    return (
      <div className="min-h-screen bg-black py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg shadow-xl p-8 border border-gray-700">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              <Users className="w-8 h-8 text-green-500" />
              <span>2-Player Chess</span>
            </h1>
            <p className="text-gray-400 mb-8 text-center">
              Create a room or join an existing game
            </p>

            {!showJoinGame ? (
              // Start Game Form
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-2 text-green-500" />
                    Enter Your Name
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
                  />
                </div>

                {/* Time Control */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mt-6">
                  <label className="block text-sm font-semibold text-gray-300 mb-4">
                    <Clock className="w-5 h-5 inline mr-2 text-green-500" />
                    Time Control Settings
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Initial Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={initialTimeMinutes}
                        onChange={(e) => setInitialTimeMinutes(Number(e.target.value))}
                        min="1"
                        max="120"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Increment (seconds)
                      </label>
                      <input
                        type="number"
                        value={incrementSeconds}
                        onChange={(e) => setIncrementSeconds(Number(e.target.value))}
                        min="0"
                        max="60"
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <p className="text-sm text-gray-300">
                      <span className="font-semibold">Selected:</span>{' '}
                      <span className="text-lg font-bold text-green-400">
                        {formatTimeControl(initialTimeMinutes, incrementSeconds)}
                      </span>
                      {incrementSeconds > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          (Fischer delay)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleStartGame}
                    disabled={!socket}
                    className="flex-1 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Game
                  </button>
                  <button
                    onClick={() => setShowJoinGame(true)}
                    className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold text-lg hover:from-red-700 hover:to-red-800 transition-all"
                  >
                    Join Game
                  </button>
                </div>
              </>
            ) : (
              // Join Game Form
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    <Users className="w-4 h-4 inline mr-2 text-red-500" />
                    Enter Your Name
                  </label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-500"
                  />
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Game Room ID Code
                  </label>
                  <input
                    type="text"
                    value={joinGameRoomCode}
                    onChange={(e) => setJoinGameRoomCode(e.target.value.toUpperCase())}
                    placeholder="Enter room code"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-gray-500 font-mono"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={handleJoinGame}
                    disabled={isCreating || !socket}
                    className="flex-1 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold text-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Joining...' : 'Join Game'}
                  </button>
                  <button
                    onClick={() => setShowJoinGame(false)}
                    disabled={isCreating}
                    className="flex-1 py-4 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all disabled:opacity-50"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show waiting for opponent UI
  if (waitingForOpponent && gameRoomId) {
    return (
      <div className="min-h-screen bg-black py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 rounded-lg shadow-xl p-8 border border-gray-700">
            <div className="space-y-6">
              <div className="bg-yellow-900 rounded-lg p-6 border border-yellow-700">
                <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center justify-center gap-2">
                  <Clock className="w-6 h-6 animate-pulse" />
                  Waiting for Opponent...
                </h2>
                <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
                  <p className="text-sm text-gray-300 mb-1 text-center">
                    <span className="font-semibold">Room Code:</span>{' '}
                    <span className="font-mono text-lg font-bold text-green-400">{gameRoomId}</span>
                  </p>
                  <p className="text-sm text-gray-400 text-center">
                    Share this code with your opponent
                  </p>
                </div>
              </div>

              <div className="border-2 border-gray-700 rounded-lg p-6 bg-gray-800">
                <h3 className="text-lg font-bold text-white mb-3 text-center">
                  Game Link
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/play-chess`}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded-lg text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyRoomCode}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    {copiedLink === 'room' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            {/* Players */}
            {opponentName && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-blue-800">
                    {playerName} (You) as {playerColor === 'white' ? 'White' : 'Black'}
                  </span>
                  <span className="text-sm font-semibold text-blue-800">
                    vs {opponentName} as {playerColor === 'white' ? 'Black' : 'White'}
                  </span>
                </div>
              </div>
            )}

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
                    disabled={gameStatus.isGameOver || !!(opponentName && !waitingForOpponent && (
                      (playerColor === 'white' && chess.turn() !== 'w') || 
                      (playerColor === 'black' && chess.turn() !== 'b')
                    ))}
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
