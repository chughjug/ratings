import React, { useState, useEffect, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import ChessBoard from '../components/chess/ChessBoard';
import { RotateCcw, FlipHorizontal, Square, Clock, Save, Copy, Check, Users, X, Minus } from 'lucide-react';
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
  const [socketConnected, setSocketConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameRoomId, setGameRoomId] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [showRoomCreation, setShowRoomCreation] = useState(true);
  const [joinGameRoomCode, setJoinGameRoomCode] = useState('');
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>(() => {
    // Check URL params for initial color
    const urlParams = new URLSearchParams(window.location.search);
    const colorParam = urlParams.get('color');
    return (colorParam === 'white' || colorParam === 'black') ? colorParam : 'white';
  });
  
  // Clock state - 3+2 time control
  const initialTimeMinutes = 3;
  const initialIncrementSeconds = 2;
  const initialTime = initialTimeMinutes * 60 * 1000; // 3 minutes in milliseconds
  const [clockTimes, setClockTimes] = useState<ClockTimes>({
    white: initialTime,
    black: initialTime,
  });
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [activeColor, setActiveColor] = useState<'white' | 'black'>('white');
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [incrementSeconds, setIncrementSeconds] = useState(initialIncrementSeconds);
  const [drawOffered, setDrawOffered] = useState(false);
  const [opponentDrawOffer, setOpponentDrawOffer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    const socketUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : 'http://localhost:5000';
    
    console.log('Connecting to socket.io at:', socketUrl);
    
    // Check URL parameters for custom game setup
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const nameParam = urlParams.get('name');
    const colorParam = urlParams.get('color');
    
    // Set player name from URL if provided
    if (nameParam && !playerName) {
      setPlayerName(nameParam);
    }
    
    // Set player color from URL if provided
    if (colorParam && (colorParam === 'white' || colorParam === 'black')) {
      setPlayerColor(colorParam);
    }
    
    const newSocket = io(socketUrl, {
      path: '/socket.io/',
      transports: ['polling', 'websocket'], // Prefer polling first for Heroku compatibility
      upgrade: true,
      rememberUpgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      multiplex: true
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      setSocketConnected(true);
      
      // Check if we have a room in URL params and auto-join
      if (roomParam && !gameRoomId) {
        const playerNameToUse = nameParam || playerName;
        if (playerNameToUse) {
          console.log('Auto-joining room from URL:', roomParam, 'as', playerNameToUse);
          setGameRoomId(roomParam.toUpperCase());
          setShowRoomCreation(false);
          newSocket.emit('join', roomParam.toUpperCase(), playerNameToUse, false, 0);
        }
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setSocketConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setSocketConnected(false);
    });

    newSocket.on('offer-draw', () => {
      setOpponentDrawOffer(true);
    });

    newSocket.on('decline-draw', () => {
      setOpponentDrawOffer(false);
      setDrawOffered(false);
    });

    newSocket.on('resign', () => {
      setGameStatus({
        isGameOver: true,
        result: playerColor === 'white' ? 'White wins by resignation!' : 'Black wins by resignation!',
        inCheck: false,
      });
      setIsClockRunning(false);
    });

    newSocket.on('game-over', (data: { result: string }) => {
      setGameStatus({
        isGameOver: true,
        result: data.result,
        inCheck: false,
      });
      setIsClockRunning(false);
      setDrawOffered(false);
      setOpponentDrawOffer(false);
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
      
      // Determine player color: 
      // - rejoin=false means first player who created room (WHITE)
      // - rejoin=true means second player who joined room (BLACK)
      // This matches lichess/chess.com behavior: first player = white
      setPlayerColor(rejoin ? 'black' : 'white');
      
      console.log(`Player ${playerName} assigned color: ${rejoin ? 'black' : 'white'}`);
      
      // If there are existing moves, restore the game state
      if (moveObj && moveCount && parseInt(moveCount) > 0) {
        try {
          // Restore game from move history if reconnecting
          console.log('Restoring game from move history:', moveCount, 'moves');
        } catch (error) {
          console.error('Error restoring game state:', error);
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            // Update move history
            setMoveHistory((prev) => [...prev, moveResult]);
            
            // Update board state
            const newBoard = chess.board();
            setBoard(newBoard);
            
            // Switch active color for clock
            setActiveColor(moveResult.color === 'w' ? 'black' : 'white');
            
            // Start clock on first move (if it's white's first move)
            if (!isClockRunning && moveHistory.length === 0 && moveResult.color === 'w') {
              setIsClockRunning(true);
            }
            
            // Add increment to the player who just moved (if clock is running)
            if (incrementSeconds > 0 && isClockRunning) {
              setClockTimes((prev) => ({
                ...prev,
                [moveResult.color === 'w' ? 'white' : 'black']: prev[moveResult.color === 'w' ? 'white' : 'black'] + incrementSeconds * 1000
              }));
            }
            
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
  }, [socket, chess, isClockRunning, moveHistory.length, incrementSeconds]);

  const handleStartGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!socket || !socketConnected) {
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
      // Update move history
      setMoveHistory((prev) => [...prev, move]);
      
      // Update board state immediately
      const newBoard = chess.board();
      setBoard(newBoard);
      
      // Start clock on first move (after white's first move)
      if (!isClockRunning && moveHistory.length === 0 && move.color === 'w') {
        setIsClockRunning(true);
      }
      
      // Switch active color for clock after move is made
      setActiveColor(move.color === 'w' ? 'black' : 'white');
      
      // Add increment to the player who just moved (after they move)
      if (incrementSeconds > 0 && isClockRunning) {
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

  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      if (socket && gameRoomId) {
        socket.emit('resign');
      }
      setGameStatus({
        isGameOver: true,
        result: playerColor === 'white' ? 'Black wins by resignation!' : 'White wins by resignation!',
        inCheck: false,
      });
      setIsClockRunning(false);
    }
  };

  const handleOfferDraw = () => {
    if (socket && gameRoomId) {
      socket.emit('offer-draw');
      setDrawOffered(true);
    }
  };

  const handleAcceptDraw = () => {
    if (socket && gameRoomId) {
      socket.emit('accept-draw');
    }
    setGameStatus({
      isGameOver: true,
      result: 'Draw by agreement!',
      inCheck: false,
    });
    setIsClockRunning(false);
    setDrawOffered(false);
    setOpponentDrawOffer(false);
  };

  const handleDeclineDraw = () => {
    if (socket && gameRoomId) {
      socket.emit('decline-draw');
    }
    setDrawOffered(false);
    setOpponentDrawOffer(false);
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
      setDrawOffered(false);
      setOpponentDrawOffer(false);
      updateGameStatus();
    } catch (error) {
      console.error('Error resetting game:', error);
    }
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
  console.log('Render check:', { showRoomCreation, waitingForOpponent, gameRoomId, boardLength: board?.length });
  
  if (showRoomCreation) {
    return (
      <div className="min-h-screen bg-[#262421] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1f1d1b] rounded-lg shadow-xl p-8 border border-[#3d3935]">
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
                        readOnly
                        disabled
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Increment (seconds)
                      </label>
                      <input
                        type="number"
                        value={incrementSeconds}
                        readOnly
                        disabled
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg opacity-50 cursor-not-allowed"
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
                    disabled={!socket || !socketConnected}
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
      <div className="min-h-screen bg-[#262421] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1f1d1b] rounded-lg shadow-xl p-8 border border-[#3d3935]">
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
      <div className="min-h-screen bg-[#262421] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Top Bar - Time Control and Game Info */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">
                {initialTimeMinutes}+{incrementSeconds} • Unrated
              </span>
              {opponentName && (
                <span className="text-sm text-gray-400">
                  {playerName} vs {opponentName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleFlip}
                className="px-3 py-1.5 bg-[#3d3935] hover:bg-[#504b47] rounded text-sm transition-colors"
                title="Flip Board"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Panel - Move History */}
            <div className="lg:w-80 bg-[#1f1d1b] rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Moves</h3>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-[#3d3935] hover:bg-[#504b47] rounded text-sm transition-colors"
                  title="New Game"
                >
                  New
                </button>
              </div>
              
              <div className="bg-[#262421] rounded p-3 max-h-[500px] overflow-y-auto">
                {moveHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">Starting Position</p>
                ) : (
                  <div className="space-y-1">
                    {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
                      const whiteMove = moveHistory[i * 2];
                      const blackMove = moveHistory[i * 2 + 1];
                      return (
                        <div key={i} className="flex items-center gap-2 py-1 px-2 hover:bg-[#3d3935] rounded">
                          <span className="text-gray-400 w-6 text-sm">{i + 1}.</span>
                          {whiteMove && (
                            <span className="text-white text-sm cursor-pointer hover:text-blue-400">
                              {whiteMove.san}
                            </span>
                          )}
                          {blackMove && (
                            <span className="text-white text-sm cursor-pointer hover:text-blue-400">
                              {blackMove.san}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Draw Offer Notification */}
              {opponentDrawOffer && (
                <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded">
                  <p className="text-sm mb-2">Your opponent offers a draw</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAcceptDraw}
                      className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={handleDeclineDraw}
                      className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Game Result */}
              {gameStatus.result && (
                <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded">
                  <p className="text-sm font-semibold">{gameStatus.result}</p>
                </div>
              )}
            </div>

            {/* Center - Chess Board */}
            <div className="flex-1 flex flex-col items-center">
              {/* Opponent Info and Clock (Top) */}
              <div className="w-full mb-4">
                <div className="bg-[#1f1d1b] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {opponentName || 'Waiting for opponent...'}
                          {!isFlipped && playerColor === 'white' && (
                            <span className="ml-2 text-xs text-gray-400">(Black)</span>
                          )}
                          {isFlipped && playerColor === 'black' && (
                            <span className="ml-2 text-xs text-gray-400">(Black)</span>
                          )}
                        </div>
                        {opponentName && (
                          <div className="text-xs text-gray-400">Rating: 1500</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-mono font-bold ${
                        activeColor === (isFlipped ? 'white' : 'black') && isClockRunning && !gameStatus.isGameOver
                          ? 'text-yellow-400' 
                          : 'text-white'
                      }`}>
                        {formatTime(isFlipped ? clockTimes.white : clockTimes.black)}
                      </div>
                      {incrementSeconds > 0 && (
                        <div className="text-xs text-gray-400 mt-1">+{incrementSeconds}s</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chess Board */}
              <div className="bg-[#1f1d1b] rounded-lg p-4 shadow-2xl">
                <ChessBoard
                  chess={chess}
                  board={board}
                  setBoard={setBoard}
                  isFlipped={isFlipped}
                  onMove={handleMove}
                  disabled={
                    gameStatus.isGameOver || 
                    !opponentName || 
                    waitingForOpponent ||
                    (playerColor === 'white' && chess.turn() !== 'w') || 
                    (playerColor === 'black' && chess.turn() !== 'b')
                  }
                />
              </div>

              {/* Your Info and Clock (Bottom) */}
              <div className="w-full mt-4">
                <div className="bg-[#1f1d1b] rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {playerName || 'You'}
                          {!isFlipped && playerColor === 'white' && (
                            <span className="ml-2 text-xs text-gray-400">(White)</span>
                          )}
                          {isFlipped && playerColor === 'black' && (
                            <span className="ml-2 text-xs text-gray-400">(White)</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">Rating: 1500</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-mono font-bold ${
                        activeColor === (isFlipped ? 'black' : 'white') && isClockRunning && !gameStatus.isGameOver
                          ? 'text-yellow-400' 
                          : 'text-white'
                      }`}>
                        {formatTime(isFlipped ? clockTimes.black : clockTimes.white)}
                      </div>
                      {incrementSeconds > 0 && (
                        <div className="text-xs text-gray-400 mt-1">+{incrementSeconds}s</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Actions */}
              {opponentName && !waitingForOpponent && (
                <div className="w-full mt-4 flex items-center justify-center gap-3">
                  {!gameStatus.isGameOver && (
                    <>
                      <button
                        onClick={handleResign}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        title="Resign"
                      >
                        <X className="w-4 h-4" />
                        Resign
                      </button>
                      <button
                        onClick={handleOfferDraw}
                        disabled={drawOffered}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Offer Draw"
                      >
                        <Minus className="w-4 h-4" />
                        {drawOffered ? 'Draw Offered' : 'Offer Draw'}
                      </button>
                    </>
                  )}
                  {gameStatus.isGameOver && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      New Game
                    </button>
                  )}
                </div>
              )}

              {/* Game Status Message */}
              {!gameStatus.isGameOver && opponentName && !waitingForOpponent && (
                <div className="mt-3 text-center">
                  {gameStatus.inCheck && (
                    <div className="px-4 py-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
                      Check!
                    </div>
                  )}
                  {!gameStatus.inCheck && (
                    <div className="text-sm text-gray-400">
                      {chess.turn() === 'w' && playerColor === 'white' && "It's your turn!"}
                      {chess.turn() === 'w' && playerColor === 'black' && "Waiting for opponent..."}
                      {chess.turn() === 'b' && playerColor === 'black' && "It's your turn!"}
                      {chess.turn() === 'b' && playerColor === 'white' && "Waiting for opponent..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Render error:', error);
    return (
      <div className="min-h-screen bg-[#262421] text-white py-8">
        <div className="container mx-auto px-4">
          <div className="bg-[#1f1d1b] rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Chess Game</h1>
            <p className="text-gray-300 mb-4">Error: {(error as Error).message}</p>
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
